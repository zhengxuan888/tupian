#!/usr/bin/env python3
"""
择优臻选出海图片处理器 - Desktop Application
Industrial-grade image processing tool with EXIF, AI background, and watermark features.
"""

import sys
import os
import logging
import logging.handlers
from datetime import datetime


def setup_logging():
    """Setup logging with rotation"""
    # Log directory
    log_dir = os.path.join(os.path.expanduser("~"), ".ai_image_processor", "logs")
    os.makedirs(log_dir, exist_ok=True)
    
    log_file = os.path.join(log_dir, "app.log")
    
    # Root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    
    # File handler with rotation (5MB max, keep 3 backups)
    file_handler = logging.handlers.RotatingFileHandler(
        log_file, maxBytes=5*1024*1024, backupCount=3, encoding='utf-8'
    )
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    ))
    root_logger.addHandler(file_handler)
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.WARNING)
    console_handler.setFormatter(logging.Formatter(
        '%(levelname)s: %(message)s'
    ))
    root_logger.addHandler(console_handler)
    
    return logging.getLogger(__name__)


def check_critical_deps():
    """Check if critical dependencies are installed"""
    missing_critical = []
    missing_optional = []
    
    # Critical dependencies
    critical = {
        'PyQt5': 'PyQt5',
        'piexif': 'piexif',
        'cv2': 'opencv-python',
        'numpy': 'numpy',
        'PIL': 'Pillow',
        'requests': 'requests',
    }
    
    for module, pip_name in critical.items():
        try:
            __import__(module)
        except ImportError:
            missing_critical.append(pip_name)
    
    # Optional dependencies
    optional = {
        'rembg': 'rembg (AI background removal)',
    }
    
    for module, desc in optional.items():
        try:
            __import__(module)
        except ImportError:
            missing_optional.append(desc)
    
    return missing_critical, missing_optional


def show_missing_deps_dialog(missing_critical, missing_optional):
    """Show a friendly setup dialog for non-technical users"""
    # Build message
    msg = "择优臻选出海图片处理器 - Setup Required\n"
    msg += "=" * 45 + "\n\n"
    
    if missing_critical:
        msg += "Missing required components:\n\n"
        for m in missing_critical:
            msg += f"  - {m}\n"
        msg += "\n"
        msg += "Quick fix: Double-click 'setup.bat' in the program folder.\n\n"
        msg += "Or open CMD and run:\n"
        msg += "  pip install PyQt5 piexif Pillow opencv-python-headless numpy requests\n"
    
    if missing_optional:
        msg += "\nOptional (not required):\n"
        for m in missing_optional:
            msg += f"  - {m}\n"
        msg += "\n  Install with: pip install rembg\n"
    
    msg += "\n" + "=" * 45
    
    # Try tkinter first (works without PyQt5)
    try:
        import tkinter as tk
        from tkinter import messagebox
        root = tk.Tk()
        root.withdraw()
        messagebox.showwarning("Setup Required", msg)
        root.destroy()
        return
    except Exception:
        pass
    
    # Try PyQt5
    try:
        from PyQt5.QtWidgets import QApplication, QMessageBox
        app = QApplication.instance() or QApplication(sys.argv)
        QMessageBox.warning(None, "Setup Required", msg)
        return
    except Exception:
        pass
    
    # Fallback to console
    print("\n" + msg)


def main():
    logger = setup_logging()
    logger.info("Starting 择优臻选出海图片处理器")
    
    # Check dependencies
    missing_critical, missing_optional = check_critical_deps()
    
    if missing_critical:
        logger.error(f"Missing critical dependencies: {missing_critical}")
        show_missing_deps_dialog(missing_critical, missing_optional)
        sys.exit(1)
    
    if missing_optional:
        logger.warning(f"Missing optional dependencies: {missing_optional}")
    
    # Import PyQt5 after dependency check
    from PyQt5.QtWidgets import QApplication
    from PyQt5.QtCore import Qt
    
    # High DPI support
    try:
        QApplication.setAttribute(Qt.AA_EnableHighDpiScaling, True)
        QApplication.setAttribute(Qt.AA_UseHighDpiPixmaps, True)
    except AttributeError:
        pass
    
    try:
        QApplication.setHighDpiScaleFactorRoundingPolicy(
            Qt.HighDpiScaleFactorRoundingPolicy.PassThrough
        )
    except AttributeError:
        pass
    
    app = QApplication(sys.argv)
    app.setApplicationName("择优臻选出海图片处理器")
    app.setOrganizationName("AIImageProcessor")
    
    # Set application font
    from PyQt5.QtGui import QFont
    font = QFont()
    # Try system fonts in order of preference
    for font_name in ["Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", "WenQuanYi Micro Hei", "Arial"]:
        font.setFamily(font_name)
        if font.exactMatch():
            break
    font.setPointSize(10)
    app.setFont(font)
    
    # Show optional deps warning (non-blocking)
    if missing_optional:
        from PyQt5.QtWidgets import QMessageBox
        msg = "Some optional features are unavailable:\n\n"
        for m in missing_optional:
            msg += f"  - {m}\n"
        msg += "\nInstall all deps: pip install -r requirements.txt"
        QMessageBox.information(None, "Optional Dependencies", msg)
    
    # Create and show main window
    from ui.main_window import MainWindow
    window = MainWindow()
    window.show()
    
    logger.info("Application started successfully")
    sys.exit(app.exec_())


if __name__ == "__main__":
    main()
