# Main Window - Industrial Grade
# PyQt5 main window with drag & drop, status bar, menus, shortcuts, persistence

import os
import sys
import json
import logging
import random
import tempfile
from datetime import datetime, timedelta

from PyQt5.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, QTabWidget,
    QPushButton, QLabel, QFileDialog, QListWidget, QListWidgetItem,
    QComboBox, QDateTimeEdit, QMessageBox, QProgressBar, QGroupBox,
    QScrollArea, QGridLayout, QLineEdit, QCheckBox, QSpinBox,
    QSplitter, QFrame, QStatusBar, QMenuBar, QAction, QShortcut,
    QToolButton, QSizePolicy, QApplication, QAbstractItemView
)
from PyQt5.QtCore import (
    Qt, QDateTime, QThread, pyqtSignal, QSize, QMimeData
)
from PyQt5.QtGui import QPixmap, QImage, QIcon, QKeySequence, QDragEnterEvent, QDropEvent

from data.countries import COUNTRIES, REGIONS, get_countries_by_region, search_countries, get_random_gps
from data.phones import PHONES
from core.exif_writer import write_exif, generate_random_datetime, batch_write_exif, read_exif
from core.ai_background import (
    remove_background, generate_background, composite_images,
    PRESET_BACKGROUNDS, CancellationError, generate_from_local
)
from core.watermark import detect_watermark_regions, remove_watermark_auto

logger = logging.getLogger(__name__)

# Config file path
CONFIG_DIR = os.path.join(os.path.expanduser("~"), ".ai_image_processor")
CONFIG_FILE = os.path.join(CONFIG_DIR, "config.json")


def load_config():
    """Load user configuration from file"""
    try:
        if os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        logger.warning(f"Failed to load config: {e}")
    return {}


def save_config(config):
    """Save user configuration to file"""
    try:
        os.makedirs(CONFIG_DIR, exist_ok=True)
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(config, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.warning(f"Failed to save config: {e}")


# ==================== Worker Threads ====================

class ExifWorker(QThread):
    """Worker thread for EXIF batch writing"""
    progress = pyqtSignal(int, int)  # current, total
    finished = pyqtSignal(list, list)  # success, skipped
    error = pyqtSignal(str)

    def __init__(self, image_paths, configs, output_dir, user_comment):
        super().__init__()
        self.image_paths = image_paths
        self.configs = configs
        self.output_dir = output_dir
        self.user_comment = user_comment

    def run(self):
        try:
            success, skipped = batch_write_exif(
                self.image_paths, self.configs, self.output_dir,
                self.user_comment,
                lambda c, t: self.progress.emit(c, t)
            )
            self.finished.emit(success, skipped)
        except Exception as e:
            self.error.emit(str(e))


class AiBackgroundWorker(QThread):
    """Worker thread for AI background processing"""
    progress = pyqtSignal(str)  # status message
    finished = pyqtSignal(str)  # output path
    error = pyqtSignal(str)

    def __init__(self, image_path, prompt_or_path, output_dir, mode="ai", is_local=False):
        super().__init__()
        self.image_path = image_path
        self.prompt_or_path = prompt_or_path
        self.output_dir = output_dir
        self.mode = mode  # "ai" or "local"
        self.is_local = is_local
        self.cancel_event = None
        self._temp_dir = None

    def set_cancel_event(self, event):
        self.cancel_event = event

    def run(self):
        self._temp_dir = tempfile.mkdtemp(prefix="ai_bg_")
        
        try:
            # Step 1: Remove background
            self.progress.emit("Removing background...")
            nobg_path = os.path.join(self._temp_dir, "nobg.png")
            
            result = remove_background(self.image_path, nobg_path, self.cancel_event)
            if result is None:
                if self.cancel_event and self.cancel_event.is_set():
                    self.error.emit("Cancelled")
                else:
                    self.error.emit("Background removal failed. Is rembg installed?")
                return

            # Step 2: Generate/prepare background
            self.progress.emit("Generating new background...")
            bg_path = os.path.join(self._temp_dir, "background.jpg")
            
            if self.is_local:
                result = generate_from_local(self.prompt_or_path, bg_path, self.cancel_event)
            else:
                result = generate_background(
                    self.prompt_or_path, bg_path, cancel_event=self.cancel_event
                )
            
            if result is None:
                if self.cancel_event and self.cancel_event.is_set():
                    self.error.emit("Cancelled")
                else:
                    self.error.emit("Background generation failed. Check your network.")
                return

            # Step 3: Composite
            self.progress.emit("Compositing...")
            filename = f"ai_bg_{os.path.splitext(os.path.basename(self.image_path))[0]}.png"
            output_path = os.path.join(self.output_dir, filename)
            
            result = composite_images(nobg_path, bg_path, output_path, self.cancel_event)
            if result is None:
                self.error.emit("Composite failed")
                return

            self.finished.emit(result)

        except Exception as e:
            self.error.emit(str(e))


# ==================== Drag & Drop Widgets ====================

class DropArea(QFrame):
    """Drag & drop area for images"""
    files_dropped = pyqtSignal(list)

    def __init__(self, text="Drag images here or click to select", parent=None):
        super().__init__(parent)
        self.setAcceptDrops(True)
        self.setMinimumHeight(100)
        self.setFrameShape(QFrame.StyledPanel)
        self.setStyleSheet("""
            DropArea {
                border: 2px dashed #aaa;
                border-radius: 8px;
                background: #f8f8f8;
            }
            DropArea:hover {
                border-color: #4a90d9;
                background: #f0f4ff;
            }
        """)
        
        layout = QVBoxLayout(self)
        self.label = QLabel(text)
        self.label.setAlignment(Qt.AlignCenter)
        self.label.setStyleSheet("border: none; background: transparent; color: #666;")
        layout.addWidget(self.label)

    def dragEnterEvent(self, event: QDragEnterEvent):
        if event.mimeData().hasUrls():
            event.acceptProposedAction()
            self.setStyleSheet("""
                DropArea {
                    border: 2px dashed #4a90d9;
                    border-radius: 8px;
                    background: #e8f0ff;
                }
            """)

    def dragLeaveEvent(self, event):
        self.setStyleSheet("""
            DropArea {
                border: 2px dashed #aaa;
                border-radius: 8px;
                background: #f8f8f8;
            }
        """)

    def dropEvent(self, event: QDropEvent):
        self.setStyleSheet("""
            DropArea {
                border: 2px dashed #aaa;
                border-radius: 8px;
                background: #f8f8f8;
            }
        """)
        files = []
        for url in event.mimeData().urls():
            path = url.toLocalFile()
            if path.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp', '.webp')):
                files.append(path)
        if files:
            self.files_dropped.emit(files)


# ==================== Main Window ====================

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("择优臻选出海图片处理器")
        self.setMinimumSize(1000, 700)
        self.resize(1200, 800)
        
        # State
        self.image_paths = []
        self.configs = []
        self.output_dir = ""
        self.exif_worker = None
        self.ai_worker = None
        self.ai_cancel_event = None
        
        # Load config
        self.config = load_config()
        self.output_dir = self.config.get("output_dir", "")
        
        self.init_ui()
        self.init_menu()
        self.init_shortcuts()
        self.init_statusbar()
        self.restore_state()

    def init_menu(self):
        """Initialize menu bar"""
        menubar = self.menuBar()
        
        # File menu
        file_menu = menubar.addMenu("&File")
        
        add_action = QAction("&Add Images...", self)
        add_action.setShortcut("Ctrl+O")
        add_action.triggered.connect(self.add_images)
        file_menu.addAction(add_action)
        
        set_output_action = QAction("Set &Output Folder...", self)
        set_output_action.setShortcut("Ctrl+Shift+O")
        set_output_action.triggered.connect(self.set_output_dir)
        file_menu.addAction(set_output_action)
        
        file_menu.addSeparator()
        
        exit_action = QAction("E&xit", self)
        exit_action.setShortcut("Ctrl+Q")
        exit_action.triggered.connect(self.close)
        file_menu.addAction(exit_action)
        
        # Tools menu
        tools_menu = menubar.addMenu("&Tools")
        
        clear_action = QAction("&Clear All", self)
        clear_action.setShortcut("Ctrl+L")
        clear_action.triggered.connect(self.clear_all)
        tools_menu.addAction(clear_action)
        
        # Help menu
        help_menu = menubar.addMenu("&Help")
        
        about_action = QAction("&About", self)
        about_action.triggered.connect(self.show_about)
        help_menu.addAction(about_action)

    def init_shortcuts(self):
        """Initialize keyboard shortcuts"""
        pass  # Shortcuts are set in menu actions

    def init_statusbar(self):
        """Initialize status bar"""
        self.statusBar().showMessage("Ready")
        
        # Add permanent widgets to status bar
        self.status_images = QLabel("Images: 0")
        self.status_configs = QLabel("Configs: 0")
        self.statusBar().addPermanentWidget(self.status_images)
        self.statusBar().addPermanentWidget(self.status_configs)

    def init_ui(self):
        """Initialize main UI"""
        central = QWidget()
        self.setCentralWidget(central)
        main_layout = QVBoxLayout(central)
        main_layout.setContentsMargins(12, 12, 12, 12)
        main_layout.setSpacing(8)
        
        # Top bar: output dir
        top_bar = QHBoxLayout()
        top_bar.addWidget(QLabel("Output:"))
        self.output_dir_edit = QLineEdit(self.output_dir)
        self.output_dir_edit.setPlaceholderText("Select output folder...")
        self.output_dir_edit.setReadOnly(True)
        top_bar.addWidget(self.output_dir_edit, 1)
        
        btn_output = QPushButton("Browse...")
        btn_output.clicked.connect(self.set_output_dir)
        top_bar.addWidget(btn_output)
        main_layout.addLayout(top_bar)
        
        # Tab widget
        self.tabs = QTabWidget()
        main_layout.addWidget(self.tabs, 1)
        
        # Tab 1: EXIF Batch Writer
        self.tabs.addTab(self.create_exif_tab(), "EXIF Batch Writer")
        
        # Tab 2: AI Background
        self.tabs.addTab(self.create_ai_tab(), "AI Background")
        
        # Tab 3: Watermark Removal
        self.tabs.addTab(self.create_watermark_tab(), "Watermark Removal")
        
        # Bottom: progress
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        main_layout.addWidget(self.progress_bar)

    def create_exif_tab(self):
        """Create EXIF batch writer tab"""
        widget = QWidget()
        layout = QHBoxLayout(widget)
        
        # Left panel: images + configs
        left_panel = QVBoxLayout()
        
        # Image list
        img_group = QGroupBox("Input Images")
        img_layout = QVBoxLayout(img_group)
        
        self.drop_area = DropArea("Drag JPEG images here or click Add")
        self.drop_area.files_dropped.connect(self.on_files_dropped)
        img_layout.addWidget(self.drop_area)
        
        btn_row = QHBoxLayout()
        btn_add = QPushButton("Add Images")
        btn_add.clicked.connect(self.add_images)
        btn_row.addWidget(btn_add)
        
        btn_clear = QPushButton("Clear")
        btn_clear.clicked.connect(self.clear_images)
        btn_row.addWidget(btn_clear)
        img_layout.addLayout(btn_row)
        
        self.image_list = QListWidget()
        self.image_list.setSelectionMode(QAbstractItemView.ExtendedSelection)
        left_panel.addWidget(img_group)
        
        # Config list
        config_group = QGroupBox("EXIF Configurations")
        config_layout = QVBoxLayout(config_group)
        
        self.config_list = QListWidget()
        config_layout.addWidget(self.config_list)
        
        # Config buttons
        config_btn_row = QHBoxLayout()
        
        btn_add_config = QPushButton("Add Config")
        btn_add_config.clicked.connect(self.add_config)
        config_btn_row.addWidget(btn_add_config)
        
        btn_remove_config = QPushButton("Remove")
        btn_remove_config.clicked.connect(self.remove_config)
        config_btn_row.addWidget(btn_remove_config)
        
        btn_batch = QPushButton("Batch Generate")
        btn_batch.clicked.connect(self.batch_generate)
        config_btn_row.addWidget(btn_batch)
        
        btn_clear_configs = QPushButton("Clear All")
        btn_clear_configs.clicked.connect(self.clear_configs)
        config_btn_row.addWidget(btn_clear_configs)
        
        config_layout.addLayout(config_btn_row)
        left_panel.addWidget(config_group)
        
        layout.addLayout(left_panel, 1)
        
        # Right panel: config editor + actions
        right_panel = QVBoxLayout()
        
        # Config editor
        editor_group = QGroupBox("Config Editor")
        editor_layout = QGridLayout(editor_group)
        
        # Country selector
        editor_layout.addWidget(QLabel("Country:"), 0, 0)
        self.region_combo = QComboBox()
        for key, name in REGIONS.items():
            self.region_combo.addItem(f"{name}", key)
        self.region_combo.currentIndexChanged.connect(self.on_region_changed)
        editor_layout.addWidget(self.region_combo, 0, 1)
        
        self.country_combo = QComboBox()
        self.country_combo.setEditable(True)
        editor_layout.addWidget(self.country_combo, 0, 2)
        
        # Phone selector
        editor_layout.addWidget(QLabel("Phone:"), 1, 0)
        self.phone_make_combo = QComboBox()
        makes = sorted(set(p["make"] for p in PHONES))
        self.phone_make_combo.addItems(makes)
        self.phone_make_combo.currentTextChanged.connect(self.on_phone_make_changed)
        editor_layout.addWidget(self.phone_make_combo, 1, 1)
        
        self.phone_model_combo = QComboBox()
        self.on_phone_make_changed(self.phone_make_combo.currentText())
        editor_layout.addWidget(self.phone_model_combo, 1, 2)
        
        # Datetime
        editor_layout.addWidget(QLabel("DateTime:"), 2, 0)
        self.datetime_edit = QDateTimeEdit()
        self.datetime_edit.setDateTime(QDateTime.currentDateTime())
        self.datetime_edit.setDisplayFormat("yyyy-MM-dd HH:mm:ss")
        self.datetime_edit.setCalendarPopup(True)
        editor_layout.addWidget(self.datetime_edit, 2, 1, 1, 2)
        
        # Random time checkbox
        self.random_time_check = QCheckBox("Random (last 3 months)")
        self.random_time_check.setChecked(True)
        editor_layout.addWidget(self.random_time_check, 3, 0, 1, 3)
        
        # GPS display
        editor_layout.addWidget(QLabel("GPS:"), 4, 0)
        self.gps_label = QLabel("Auto from country")
        self.gps_label.setStyleSheet("color: #666;")
        editor_layout.addWidget(self.gps_label, 4, 1, 1, 2)
        
        # Add config button
        btn_add_single = QPushButton("Add This Config")
        btn_add_single.setStyleSheet("background: #4a90d9; color: white; font-weight: bold; padding: 8px;")
        btn_add_single.clicked.connect(self.add_config_from_editor)
        editor_layout.addWidget(btn_add_single, 5, 0, 1, 3)
        
        right_panel.addWidget(editor_group)
        
        # User comment
        comment_group = QGroupBox("User Comment (Optional)")
        comment_layout = QVBoxLayout(comment_group)
        self.comment_edit = QLineEdit()
        self.comment_edit.setPlaceholderText("EXIF UserComment...")
        comment_layout.addWidget(self.comment_edit)
        right_panel.addWidget(comment_group)
        
        # Action buttons
        action_group = QGroupBox("Actions")
        action_layout = QVBoxLayout(action_group)
        
        self.btn_export = QPushButton("Export EXIF")
        self.btn_export.setStyleSheet("background: #27ae60; color: white; font-weight: bold; padding: 12px; font-size: 14px;")
        self.btn_export.clicked.connect(self.export_exif)
        action_layout.addWidget(self.btn_export)
        
        self.btn_cancel = QPushButton("Cancel")
        self.btn_cancel.setVisible(False)
        self.btn_cancel.clicked.connect(self.cancel_export)
        action_layout.addWidget(self.btn_cancel)
        
        right_panel.addWidget(action_group)
        right_panel.addStretch()
        
        layout.addLayout(right_panel, 1)
        
        # Initialize country list
        self.on_region_changed(0)
        
        return widget

    def create_ai_tab(self):
        """Create AI background tab"""
        widget = QWidget()
        layout = QHBoxLayout(widget)
        
        # Left: image
        left_panel = QVBoxLayout()
        
        self.ai_drop = DropArea("Drag an image here for AI background replacement")
        self.ai_drop.files_dropped.connect(self.on_ai_files_dropped)
        left_panel.addWidget(self.ai_drop)
        
        self.ai_preview = QLabel()
        self.ai_preview.setAlignment(Qt.AlignCenter)
        self.ai_preview.setMinimumHeight(300)
        self.ai_preview.setStyleSheet("border: 1px solid #ddd; border-radius: 8px; background: #fafafa;")
        left_panel.addWidget(self.ai_preview, 1)
        
        layout.addLayout(left_panel, 1)
        
        # Right: settings + result
        right_panel = QVBoxLayout()
        
        # Background mode
        mode_group = QGroupBox("Background Mode")
        mode_layout = QVBoxLayout(mode_group)
        
        self.ai_mode_combo = QComboBox()
        self.ai_mode_combo.addItem("AI Generated (Pollinations)", "ai")
        self.ai_mode_combo.addItem("Local Image", "local")
        mode_layout.addWidget(self.ai_mode_combo)
        
        # Prompt
        self.prompt_edit = QLineEdit()
        self.prompt_edit.setPlaceholderText("Describe the background... (e.g. 'beach at sunset')")
        mode_layout.addWidget(self.prompt_edit)
        
        btn_local = QPushButton("Select Local Background...")
        btn_local.clicked.connect(self.select_local_bg)
        mode_layout.addWidget(btn_local)
        self.local_bg_path = ""
        
        # Presets
        preset_group = QGroupBox("Presets")
        preset_layout = QGridLayout(preset_group)
        for i, preset in enumerate(PRESET_BACKGROUNDS):
            btn = QPushButton(preset["name_cn"])
            btn.setToolTip(preset["prompt"])
            btn.clicked.connect(lambda checked, p=preset: self.use_preset(p))
            preset_layout.addWidget(btn, i // 3, i % 3)
        mode_layout.addWidget(preset_group)
        
        right_panel.addWidget(mode_group)
        
        # Action
        self.btn_ai_start = QPushButton("Start Processing")
        self.btn_ai_start.setStyleSheet("background: #8e44ad; color: white; font-weight: bold; padding: 12px; font-size: 14px;")
        self.btn_ai_start.clicked.connect(self.start_ai_processing)
        right_panel.addWidget(self.btn_ai_start)
        
        self.btn_ai_cancel = QPushButton("Cancel")
        self.btn_ai_cancel.setVisible(False)
        self.btn_ai_cancel.clicked.connect(self.cancel_ai)
        right_panel.addWidget(self.btn_ai_cancel)
        
        # Result preview
        result_group = QGroupBox("Result")
        result_layout = QVBoxLayout(result_group)
        self.ai_result_label = QLabel("No result yet")
        self.ai_result_label.setAlignment(Qt.AlignCenter)
        self.ai_result_label.setMinimumHeight(200)
        self.ai_result_label.setStyleSheet("border: 1px solid #ddd; border-radius: 8px; background: #fafafa;")
        result_layout.addWidget(self.ai_result_label)
        
        self.btn_ai_save = QPushButton("Save Result")
        self.btn_ai_save.setEnabled(False)
        self.btn_ai_save.clicked.connect(self.save_ai_result)
        result_layout.addWidget(self.btn_ai_save)
        
        right_panel.addWidget(result_group, 1)
        
        layout.addLayout(right_panel, 1)
        
        self.ai_image_path = None
        self.ai_result_path = None
        
        return widget

    def create_watermark_tab(self):
        """Create watermark removal tab"""
        widget = QWidget()
        layout = QHBoxLayout(widget)
        
        # Left: image
        left_panel = QVBoxLayout()
        
        self.wm_drop = DropArea("Drag an image with watermark here")
        self.wm_drop.files_dropped.connect(self.on_wm_files_dropped)
        left_panel.addWidget(self.wm_drop)
        
        self.wm_preview = QLabel()
        self.wm_preview.setAlignment(Qt.AlignCenter)
        self.wm_preview.setMinimumHeight(400)
        self.wm_preview.setStyleSheet("border: 1px solid #ddd; border-radius: 8px; background: #fafafa;")
        left_panel.addWidget(self.wm_preview, 1)
        
        layout.addLayout(left_panel, 1)
        
        # Right: controls
        right_panel = QVBoxLayout()
        
        # Detection settings
        detect_group = QGroupBox("Detection Settings")
        detect_layout = QGridLayout(detect_group)
        
        detect_layout.addWidget(QLabel("Threshold:"), 0, 0)
        self.wm_threshold = QSpinBox()
        self.wm_threshold.setRange(180, 255)
        self.wm_threshold.setValue(235)
        detect_layout.addWidget(self.wm_threshold, 0, 1)
        
        detect_layout.addWidget(QLabel("Min Area:"), 1, 0)
        self.wm_min_area = QSpinBox()
        self.wm_min_area.setRange(50, 10000)
        self.wm_min_area.setValue(300)
        detect_layout.addWidget(self.wm_min_area, 1, 1)
        
        right_panel.addWidget(detect_group)
        
        # Actions
        action_group = QGroupBox("Actions")
        action_layout = QVBoxLayout(action_group)
        
        btn_detect = QPushButton("Detect Watermark")
        btn_detect.clicked.connect(self.detect_watermark)
        action_layout.addWidget(btn_detect)
        
        btn_remove = QPushButton("Auto Remove Watermark")
        btn_remove.setStyleSheet("background: #e67e22; color: white; font-weight: bold; padding: 12px; font-size: 14px;")
        btn_remove.clicked.connect(self.remove_watermark)
        action_layout.addWidget(btn_remove)
        
        right_panel.addWidget(action_group)
        
        # Result
        result_group = QGroupBox("Result")
        result_layout = QVBoxLayout(result_group)
        self.wm_result_label = QLabel("No result yet")
        self.wm_result_label.setAlignment(Qt.AlignCenter)
        self.wm_result_label.setMinimumHeight(200)
        self.wm_result_label.setStyleSheet("border: 1px solid #ddd; border-radius: 8px; background: #fafafa;")
        result_layout.addWidget(self.wm_result_label)
        
        self.btn_wm_save = QPushButton("Save Result")
        self.btn_wm_save.setEnabled(False)
        self.btn_wm_save.clicked.connect(self.save_wm_result)
        result_layout.addWidget(self.btn_wm_save)
        
        right_panel.addWidget(result_group, 1)
        
        layout.addLayout(right_panel, 1)
        
        self.wm_image_path = None
        self.wm_result_path = None
        
        return widget

    # ==================== EXIF Tab Methods ====================

    def add_images(self):
        files, _ = QFileDialog.getOpenFileNames(
            self, "Select Images", "",
            "Images (*.jpg *.jpeg *.png *.bmp *.webp);;All Files (*)"
        )
        if files:
            self.on_files_dropped(files)

    def on_files_dropped(self, files):
        for f in files:
            if f not in self.image_paths:
                self.image_paths.append(f)
                self.image_list.addItem(os.path.basename(f))
        self.update_status()
        self.statusBar().showMessage(f"Added {len(files)} image(s)")

    def clear_images(self):
        self.image_paths.clear()
        self.image_list.clear()
        self.update_status()

    def on_region_changed(self, index):
        region = self.region_combo.itemData(index)
        countries = get_countries_by_region(region)
        self.country_combo.clear()
        for c in countries:
            self.country_combo.addItem(f"{c['flag']} {c['name_cn']} ({c['name']})", c)

    def on_phone_make_changed(self, make):
        self.phone_model_combo.clear()
        for p in PHONES:
            if p["make"] == make:
                self.phone_model_combo.addItem(p["model"], p)

    def add_config_from_editor(self):
        """Add config from the editor panel"""
        country = self.country_combo.currentData()
        if not country:
            QMessageBox.warning(self, "Warning", "Please select a country")
            return
        
        phone = self.phone_model_combo.currentData()
        if not phone:
            QMessageBox.warning(self, "Warning", "Please select a phone")
            return
        
        if self.random_time_check.isChecked():
            dt = generate_random_datetime()
        else:
            dt = self.datetime_edit.dateTime().toString("yyyy:MM:dd HH:mm:ss")
        
        config = {
            "country": country,
            "make": phone["make"],
            "model": phone["model"],
            "datetime": dt
        }
        self.configs.append(config)
        
        lat, lng = get_random_gps(country)
        display = f"{country['flag']} {country['name_cn']} | {phone['make']} {phone['model']} | {dt} | GPS({lat:.4f},{lng:.4f})"
        self.config_list.addItem(display)
        self.update_status()
        self.statusBar().showMessage("Config added")

    def add_config(self):
        self.add_config_from_editor()

    def remove_config(self):
        row = self.config_list.currentRow()
        if row >= 0 and row < len(self.configs):
            self.configs.pop(row)
            self.config_list.takeItem(row)
            self.update_status()

    def clear_configs(self):
        self.configs.clear()
        self.config_list.clear()
        self.update_status()

    def batch_generate(self):
        """Batch generate random configs"""
        count, ok = self._get_batch_count()
        if not ok:
            return
        
        for _ in range(count):
            country = random.choice(COUNTRIES)
            phone = random.choice(PHONES)
            dt = generate_random_datetime()
            
            config = {
                "country": country,
                "make": phone["make"],
                "model": phone["model"],
                "datetime": dt
            }
            self.configs.append(config)
            
            lat, lng = get_random_gps(country)
            display = f"{country['flag']} {country['name_cn']} | {phone['make']} {phone['model']} | {dt} | GPS({lat:.4f},{lng:.4f})"
            self.config_list.addItem(display)
        
        self.update_status()
        self.statusBar().showMessage(f"Generated {count} random configs")

    def _get_batch_count(self):
        count, ok = QInputDialog.getInt(self, "Batch Generate", "Number of configs (1-200):", 10, 1, 200)
        return count, ok

    def set_output_dir(self):
        dir_path = QFileDialog.getExistingDirectory(self, "Select Output Folder", self.output_dir)
        if dir_path:
            self.output_dir = dir_path
            self.output_dir_edit.setText(dir_path)
            self.config["output_dir"] = dir_path
            save_config(self.config)

    def export_exif(self):
        if not self.image_paths:
            QMessageBox.warning(self, "Warning", "Please add images first")
            return
        if not self.configs:
            QMessageBox.warning(self, "Warning", "Please add configs first")
            return
        if not self.output_dir:
            self.set_output_dir()
            if not self.output_dir:
                return
        
        user_comment = self.comment_edit.text() or None
        
        self.btn_export.setVisible(False)
        self.btn_cancel.setVisible(True)
        self.progress_bar.setVisible(True)
        self.progress_bar.setMaximum(len(self.configs) * len(self.image_paths))
        self.progress_bar.setValue(0)
        
        self.exif_worker = ExifWorker(self.image_paths, self.configs, self.output_dir, user_comment)
        self.exif_worker.progress.connect(self.on_exif_progress)
        self.exif_worker.finished.connect(self.on_exif_finished)
        self.exif_worker.error.connect(self.on_exif_error)
        self.exif_worker.start()

    def cancel_export(self):
        if self.exif_worker:
            self.exif_worker.requestInterruption()
            self.exif_worker.quit()
            self.statusBar().showMessage("Export cancelled")
        self._reset_export_ui()

    def on_exif_progress(self, current, total):
        self.progress_bar.setValue(current)
        self.statusBar().showMessage(f"Processing: {current}/{total}")

    def on_exif_finished(self, success, skipped):
        self._reset_export_ui()
        
        msg = f"Export complete!\n\nSuccess: {len(success)} files\nSkipped: {len(skipped)} files\n\nOutput: {self.output_dir}"
        QMessageBox.information(self, "Complete", msg)
        self.statusBar().showMessage(f"Export complete: {len(success)} success, {len(skipped)} skipped")

    def on_exif_error(self, error):
        self._reset_export_ui()
        QMessageBox.critical(self, "Error", f"Export failed:\n{error}")

    def _reset_export_ui(self):
        self.btn_export.setVisible(True)
        self.btn_cancel.setVisible(False)
        self.progress_bar.setVisible(False)
        self.exif_worker = None

    # ==================== AI Background Tab Methods ====================

    def on_ai_files_dropped(self, files):
        if files:
            self.ai_image_path = files[0]
            self._show_image_preview(files[0], self.ai_preview)
            self.statusBar().showMessage(f"Loaded: {os.path.basename(files[0])}")

    def use_preset(self, preset):
        self.prompt_edit.setText(preset["prompt"])
        self.statusBar().showMessage(f"Preset: {preset['name_cn']}")

    def select_local_bg(self):
        path, _ = QFileDialog.getOpenFileName(self, "Select Background Image", "", "Images (*.jpg *.png *.bmp)")
        if path:
            self.local_bg_path = path
            self.statusBar().showMessage(f"Local background: {os.path.basename(path)}")

    def start_ai_processing(self):
        if not self.ai_image_path:
            QMessageBox.warning(self, "Warning", "Please add an image first")
            return
        
        if not self.output_dir:
            self.set_output_dir()
            if not self.output_dir:
                return
        
        mode = self.ai_mode_combo.currentData()
        
        if mode == "local":
            if not self.local_bg_path:
                QMessageBox.warning(self, "Warning", "Please select a local background image")
                return
            prompt_or_path = self.local_bg_path
        else:
            prompt = self.prompt_edit.text().strip()
            if not prompt:
                QMessageBox.warning(self, "Warning", "Please enter a background description or select a preset")
                return
            prompt_or_path = prompt
        
        self.btn_ai_start.setVisible(False)
        self.btn_ai_cancel.setVisible(True)
        self.ai_cancel_event = threading.Event()
        
        self.ai_worker = AiBackgroundWorker(
            self.ai_image_path, prompt_or_path, self.output_dir,
            mode=mode, is_local=(mode == "local")
        )
        self.ai_worker.set_cancel_event(self.ai_cancel_event)
        self.ai_worker.progress.connect(self.on_ai_progress)
        self.ai_worker.finished.connect(self.on_ai_finished)
        self.ai_worker.error.connect(self.on_ai_error)
        self.ai_worker.start()

    def cancel_ai(self):
        if self.ai_cancel_event:
            self.ai_cancel_event.set()
        self.statusBar().showMessage("Cancelling...")

    def on_ai_progress(self, msg):
        self.statusBar().showMessage(msg)

    def on_ai_finished(self, output_path):
        self._reset_ai_ui()
        self.ai_result_path = output_path
        self._show_image_preview(output_path, self.ai_result_label)
        self.btn_ai_save.setEnabled(True)
        self.statusBar().showMessage(f"AI background complete: {os.path.basename(output_path)}")

    def on_ai_error(self, error):
        self._reset_ai_ui()
        if "Cancelled" not in error:
            QMessageBox.critical(self, "Error", f"AI processing failed:\n{error}")
        self.statusBar().showMessage("AI processing failed")

    def save_ai_result(self):
        if self.ai_result_path and os.path.exists(self.ai_result_path):
            path, _ = QFileDialog.getSaveFileName(self, "Save Result", "", "PNG (*.png);;JPEG (*.jpg)")
            if path:
                from shutil import copy2
                copy2(self.ai_result_path, path)
                self.statusBar().showMessage(f"Saved: {path}")

    def _reset_ai_ui(self):
        self.btn_ai_start.setVisible(True)
        self.btn_ai_cancel.setVisible(False)
        self.ai_worker = None

    # ==================== Watermark Tab Methods ====================

    def on_wm_files_dropped(self, files):
        if files:
            self.wm_image_path = files[0]
            self._show_image_preview(files[0], self.wm_preview)
            self.statusBar().showMessage(f"Loaded: {os.path.basename(files[0])}")

    def detect_watermark(self):
        if not self.wm_image_path:
            QMessageBox.warning(self, "Warning", "Please add an image first")
            return
        
        regions = detect_watermark_regions(
            self.wm_image_path,
            threshold=self.wm_threshold.value(),
            min_area=self.wm_min_area.value()
        )
        
        if regions:
            msg = f"Detected {len(regions)} potential watermark region(s):\n\n"
            for i, (x, y, w, h) in enumerate(regions[:10]):
                msg += f"  Region {i+1}: ({x}, {y}) {w}x{h}px\n"
            QMessageBox.information(self, "Detection Result", msg)
        else:
            QMessageBox.information(self, "Detection Result", "No watermark regions detected.\nTry adjusting the threshold.")

    def remove_watermark(self):
        if not self.wm_image_path:
            QMessageBox.warning(self, "Warning", "Please add an image first")
            return
        
        if not self.output_dir:
            self.set_output_dir()
            if not self.output_dir:
                return
        
        self.statusBar().showMessage("Removing watermark...")
        
        output_path = os.path.join(
            self.output_dir,
            f"no_wm_{os.path.basename(self.wm_image_path)}"
        )
        
        result = remove_watermark_auto(self.wm_image_path, output_path)
        
        if result is not None:
            self.wm_result_path = output_path
            self._show_image_preview(output_path, self.wm_result_label)
            self.btn_wm_save.setEnabled(True)
            self.statusBar().showMessage("Watermark removed!")
        else:
            QMessageBox.critical(self, "Error", "Watermark removal failed")

    def save_wm_result(self):
        if self.wm_result_path and os.path.exists(self.wm_result_path):
            path, _ = QFileDialog.getSaveFileName(self, "Save Result", "", "JPEG (*.jpg);;PNG (*.png)")
            if path:
                from shutil import copy2
                copy2(self.wm_result_path, path)
                self.statusBar().showMessage(f"Saved: {path}")

    # ==================== Utility Methods ====================

    def _show_image_preview(self, path, label):
        """Show image preview in a label"""
        try:
            pixmap = QPixmap(path)
            if pixmap.isNull():
                label.setText("Cannot load image")
                return
            
            scaled = pixmap.scaled(label.size(), Qt.KeepAspectRatio, Qt.SmoothTransformation)
            label.setPixmap(scaled)
        except Exception as e:
            label.setText(f"Preview error: {e}")

    def update_status(self):
        self.status_images.setText(f"Images: {len(self.image_paths)}")
        self.status_configs.setText(f"Configs: {len(self.configs)}")

    def clear_all(self):
        self.clear_images()
        self.clear_configs()

    def show_about(self):
        QMessageBox.about(self, "About", 
            "择优臻选出海图片处理器\n\n"
            "Features:\n"
            "  - EXIF Batch Writer (100+ countries, 60+ phones)\n"
            "  - AI Background Replacement\n"
            "  - Watermark Removal\n\n"
            "All processing is done locally on your computer."
        )

    def restore_state(self):
        """Restore window state from config"""
        if "window_geometry" in self.config:
            try:
                self.restoreGeometry(bytes.fromhex(self.config["window_geometry"]))
            except Exception:
                pass

    def closeEvent(self, event):
        """Save state on close"""
        try:
            self.config["window_geometry"] = self.saveGeometry().data().hex()
            save_config(self.config)
        except Exception:
            pass
        event.accept()


# Import QInputDialog for batch generate
from PyQt5.QtWidgets import QInputDialog
import threading
