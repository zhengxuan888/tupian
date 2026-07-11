"""Watermark Removal Module - Detect and remove watermarks from images"""

import cv2
import numpy as np
from PIL import Image
import os
import logging

logger = logging.getLogger(__name__)


def _imread_unicode(path):
    """
    Read image with support for non-ASCII paths (Chinese/Japanese/etc.)
    cv2.imread fails silently on Windows with non-ASCII paths.
    """
    try:
        data = np.fromfile(path, dtype=np.uint8)
        img = cv2.imdecode(data, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        logger.error(f"Failed to read image {path}: {e}")
        return None


def _imwrite_unicode(path, img):
    """
    Write image with support for non-ASCII paths.
    """
    try:
        ext = os.path.splitext(path)[1]
        success, buf = cv2.imencode(ext, img)
        if success:
            buf.tofile(path)
            return True
        return False
    except Exception as e:
        logger.error(f"Failed to write image {path}: {e}")
        return False


def detect_watermark_regions(image_path, threshold=200, min_area=100):
    """
    Auto-detect potential watermark regions in an image
    
    Args:
        image_path: Path to the image
        threshold: Brightness threshold for detecting light watermarks
        min_area: Minimum area of detected regions
        
    Returns:
        List of (x, y, w, h) bounding boxes
    """
    img = _imread_unicode(image_path)
    if img is None:
        logger.warning(f"Could not read image: {image_path}")
        return []
    
    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Detect bright regions (common for watermarks)
    _, bright_mask = cv2.threshold(gray, threshold, 255, cv2.THRESH_BINARY)
    
    # Detect semi-transparent regions using edge detection
    edges = cv2.Canny(gray, 50, 150)
    
    # Combine masks
    combined = cv2.bitwise_or(bright_mask, edges)
    
    # Morphological operations to connect nearby regions
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    combined = cv2.dilate(combined, kernel, iterations=2)
    combined = cv2.erode(combined, kernel, iterations=1)
    
    # Find contours - handle different OpenCV version return formats
    contour_data = cv2.findContours(combined, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if len(contour_data) == 3:
        # OpenCV 3.x
        _, contours, _ = contour_data
    else:
        # OpenCV 4.x
        contours, _ = contour_data
    
    regions = []
    img_height, img_width = img.shape[:2]
    img_area = img_height * img_width
    
    for contour in contours:
        area = cv2.contourArea(contour)
        if area >= min_area:
            x, y, w, h = cv2.boundingRect(contour)
            # Filter out regions that are too large (likely not watermarks)
            if area < img_area * 0.1:  # Less than 10% of image
                # Also filter out regions touching image edges (often not watermarks)
                if x > 5 and y > 5 and (x + w) < (img_width - 5) and (y + h) < (img_height - 5):
                    regions.append((x, y, w, h))
    
    logger.info(f"Detected {len(regions)} watermark regions in {image_path}")
    return regions


def remove_watermark_manual(image_path, mask_path=None, output_path=None, brush_size=20):
    """
    Remove watermark using manual mask
    
    Args:
        image_path: Source image path
        mask_path: Path to mask image (white = watermark area)
        output_path: Output path
        brush_size: Brush size for inpainting
        
    Returns:
        PIL Image with watermark removed
    """
    img = _imread_unicode(image_path)
    if img is None:
        return None
    
    if mask_path:
        mask = _imread_unicode(mask_path)
        if mask is not None:
            mask = cv2.cvtColor(mask, cv2.COLOR_BGR2GRAY)
        else:
            mask = np.zeros(img.shape[:2], dtype=np.uint8)
    else:
        mask = np.zeros(img.shape[:2], dtype=np.uint8)
    
    # Inpaint
    result = cv2.inpaint(img, mask, brush_size, cv2.INPAINT_TELEA)
    
    if output_path:
        _imwrite_unicode(output_path, result)
    
    return Image.fromarray(cv2.cvtColor(result, cv2.COLOR_BGR2RGB))


def remove_watermark_auto(image_path, output_path=None, threshold=200, brush_size=10):
    """
    Auto-detect and remove watermark
    
    Args:
        image_path: Source image path
        output_path: Output path
        threshold: Detection threshold
        brush_size: Inpainting brush size
        
    Returns:
        PIL Image with watermark removed
    """
    img = _imread_unicode(image_path)
    if img is None:
        return None
    
    # Detect watermark regions
    regions = detect_watermark_regions(image_path, threshold)
    
    if not regions:
        logger.info("No watermark detected, returning original image")
        return Image.open(image_path)
    
    # Create mask from detected regions
    mask = np.zeros(img.shape[:2], dtype=np.uint8)
    for (x, y, w, h) in regions:
        # Add padding around detected regions for better inpainting
        pad = 5
        y1 = max(0, y - pad)
        y2 = min(img.shape[0], y + h + pad)
        x1 = max(0, x - pad)
        x2 = min(img.shape[1], x + w + pad)
        mask[y1:y2, x1:x2] = 255
    
    # Inpaint
    result = cv2.inpaint(img, mask, brush_size, cv2.INPAINT_TELEA)
    
    if output_path:
        _imwrite_unicode(output_path, result)
    
    return Image.fromarray(cv2.cvtColor(result, cv2.COLOR_BGR2RGB))


def apply_brush_mask(image_path, points, brush_size, output_mask_path=None):
    """
    Create a mask from brush strokes
    
    Args:
        image_path: Source image path
        points: List of (x, y) points from brush strokes
        brush_size: Brush radius
        output_mask_path: Optional path to save mask
        
    Returns:
        Mask as numpy array
    """
    img = _imread_unicode(image_path)
    if img is None:
        return None
    
    mask = np.zeros(img.shape[:2], dtype=np.uint8)
    
    for point in points:
        cv2.circle(mask, tuple(point), brush_size, 255, -1)
    
    if output_mask_path:
        _imwrite_unicode(output_mask_path, mask)
    
    return mask


def inpaint_with_mask(image_path, mask, output_path=None, brush_size=10):
    """
    Inpaint image using provided mask
    
    Args:
        image_path: Source image
        mask: Binary mask (255 = area to inpaint)
        output_path: Output path
        brush_size: Inpainting radius
        
    Returns:
        PIL Image
    """
    img = _imread_unicode(image_path)
    if img is None:
        return None
    
    result = cv2.inpaint(img, mask, brush_size, cv2.INPAINT_TELEA)
    
    if output_path:
        _imwrite_unicode(output_path, result)
    
    return Image.fromarray(cv2.cvtColor(result, cv2.COLOR_BGR2RGB))
