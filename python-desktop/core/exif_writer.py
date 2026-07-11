# EXIF Writer - Industrial Grade
# Write EXIF metadata to images with robust error handling

import piexif
import os
import shutil
import random
import logging
from datetime import datetime, timedelta
from PIL import Image

logger = logging.getLogger(__name__)


def _is_jpeg(file_path):
    """Check if file is JPEG by reading magic bytes"""
    try:
        with open(file_path, 'rb') as f:
            header = f.read(3)
            return header[:2] == b'\xff\xd8'
    except Exception:
        return False


def generate_random_datetime(months_back=3):
    """Generate a random datetime within the specified number of months back"""
    now = datetime.now()
    start = now - timedelta(days=months_back * 30)
    delta = now - start
    random_seconds = random.randint(0, int(delta.total_seconds()))
    random_dt = start + timedelta(seconds=random_seconds)
    return random_dt.strftime("%Y:%m:%d %H:%M:%S")


def read_exif(file_path):
    """Read existing EXIF data from image file
    
    Returns:
        dict with keys: make, model, datetime, lat, lng, user_comment, or None values
    """
    try:
        exif_dict = piexif.load(file_path)
        result = {}
        
        # 0th IFD
        ifd_0th = exif_dict.get('0th', {})
        result['make'] = ifd_0th.get(piexif.ImageIFD.Make, b'').decode('utf-8', errors='ignore').strip('\x00')
        result['model'] = ifd_0th.get(piexif.ImageIFD.Model, b'').decode('utf-8', errors='ignore').strip('\x00')
        
        # Exif IFD
        ifd_exif = exif_dict.get('Exif', {})
        result['datetime'] = ifd_exif.get(piexif.ExifIFD.DateTimeOriginal, b'').decode('utf-8', errors='ignore').strip('\x00')
        
        # GPS IFD
        ifd_gps = exif_dict.get('GPS', {})
        if piexif.GPSIFD.GPSLatitude in ifd_gps and piexif.GPSIFD.GPSLatitudeRef in ifd_gps:
            lat_dms = ifd_gps[piexif.GPSIFD.GPSLatitude]
            lat_ref = ifd_gps[piexif.GPSIFD.GPSLatitudeRef]
            lat = _dms_to_decimal(lat_dms, lat_ref)
            lng_dms = ifd_gps[piexif.GPSIFD.GPSLongitude]
            lng_ref = ifd_gps[piexif.GPSIFD.GPSLongitudeRef]
            lng = _dms_to_decimal(lng_dms, lng_ref)
            result['lat'] = lat
            result['lng'] = lng
        else:
            result['lat'] = None
            result['lng'] = None
        
        # User Comment
        user_comment = ifd_exif.get(piexif.ExifIFD.UserComment, b'')
        if isinstance(user_comment, bytes) and len(user_comment) > 8:
            # Skip the encoding prefix (8 bytes)
            result['user_comment'] = user_comment[8:].decode('utf-8', errors='ignore').strip('\x00')
        else:
            result['user_comment'] = None
        
        return result
    except Exception as e:
        logger.warning(f"Failed to read EXIF from {file_path}: {e}")
        return None


def _dms_to_decimal(dms, ref):
    """Convert DMS (degrees, minutes, seconds) to decimal"""
    try:
        d = dms[0][0] / dms[0][1]  # degrees
        m = dms[1][0] / dms[1][1]  # minutes
        s = dms[2][0] / dms[2][1]  # seconds
        
        decimal = d + m / 60 + s / 3600
        
        if ref in [b'S', b's']:
            decimal = -decimal
        if ref in [b'W', b'w']:
            decimal = -decimal
        
        return decimal
    except Exception:
        return None


def _decimal_to_dms(decimal):
    """Convert decimal degrees to DMS format for EXIF"""
    decimal = abs(decimal)
    d = int(decimal)
    m = int((decimal - d) * 60)
    s = int(((decimal - d) * 60 - m) * 60 * 10000)
    
    return ((d, 1), (m, 1), (s, 10000))


def write_exif(image_path, output_path, make, model, datetime_str, lat=None, lng=None, user_comment=None):
    """Write EXIF data to image
    
    Args:
        image_path: Source image path
        output_path: Output image path
        make: Camera manufacturer
        model: Camera model
        datetime_str: Datetime string in format "YYYY:MM:DD HH:MM:SS"
        lat: Latitude in decimal degrees (None to skip)
        lng: Longitude in decimal degrees (None to skip)
        user_comment: User comment text (None to skip)
    
    Returns:
        bool: True if successful
    
    Raises:
        ValueError: If file is not JPEG
        FileNotFoundError: If source file doesn't exist
    """
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found: {image_path}")
    
    if not _is_jpeg(image_path):
        raise ValueError(f"Not a JPEG file: {image_path}")
    
    try:
        # Load existing EXIF or create new
        try:
            exif_dict = piexif.load(image_path)
        except Exception:
            exif_dict = {"0th": {}, "Exif": {}, "GPS": {}, "1st": {}, "thumbnail": None}
        
        # Ensure all IFDs exist
        for key in ["0th", "Exif", "GPS", "1st"]:
            if key not in exif_dict or exif_dict[key] is None:
                exif_dict[key] = {}
        
        # Write camera info
        if make:
            exif_dict["0th"][piexif.ImageIFD.Make] = make.encode('utf-8')
        if model:
            exif_dict["0th"][piexif.ImageIFD.Model] = model.encode('utf-8')
        
        # Write datetime
        if datetime_str:
            exif_dict["0th"][piexif.ImageIFD.DateTime] = datetime_str.encode('utf-8')
            exif_dict["Exif"][piexif.ExifIFD.DateTimeOriginal] = datetime_str.encode('utf-8')
            exif_dict["Exif"][piexif.ExifIFD.DateTimeDigitized] = datetime_str.encode('utf-8')
        
        # Write GPS
        if lat is not None and lng is not None:
            # Clamp to valid ranges
            lat = max(-90.0, min(90.0, lat))
            lng = max(-180.0, min(180.0, lng))
            
            exif_dict["GPS"][piexif.GPSIFD.GPSVersionID] = (2, 3, 0, 0)
            exif_dict["GPS"][piexif.GPSIFD.GPSLatitudeRef] = b'N' if lat >= 0 else b'S'
            exif_dict["GPS"][piexif.GPSIFD.GPSLatitude] = _decimal_to_dms(lat)
            exif_dict["GPS"][piexif.GPSIFD.GPSLongitudeRef] = b'E' if lng >= 0 else b'W'
            exif_dict["GPS"][piexif.GPSIFD.GPSLongitude] = _decimal_to_dms(lng)
            exif_dict["GPS"][piexif.GPSIFD.GPSAltitudeRef] = 0
            exif_dict["GPS"][piexif.GPSIFD.GPSAltitude] = (random.randint(0, 200), 1)
        
        # Write user comment
        if user_comment:
            # Unicode encoding prefix
            prefix = b"UNICODE\x00"
            exif_dict["Exif"][piexif.ExifIFD.UserComment] = prefix + user_comment.encode('utf-8')
        
        # Dump and insert
        exif_bytes = piexif.dump(exif_dict)
        
        # Ensure output directory exists
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        
        # Copy file first to preserve data
        if os.path.abspath(image_path) != os.path.abspath(output_path):
            shutil.copy2(image_path, output_path)
        
        piexif.insert(exif_bytes, output_path)
        
        logger.info(f"EXIF written: {os.path.basename(output_path)} - {make} {model}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to write EXIF to {output_path}: {e}")
        raise


def batch_write_exif(image_paths, configs, output_dir, user_comment=None, progress_callback=None):
    """Batch write EXIF data to multiple images with multiple configs
    
    Args:
        image_paths: List of source image paths
        configs: List of config dicts with keys: country, make, model, datetime
        output_dir: Output directory
        user_comment: Optional user comment
        progress_callback: Optional callback(current, total) for progress
    
    Returns:
        tuple: (success_list, skipped_list)
            success_list: [(config_index, output_path), ...]
            skipped_list: [(config_index, image_path, error_msg), ...]
    """
    os.makedirs(output_dir, exist_ok=True)
    
    total = len(configs) * len(image_paths)
    current = 0
    success = []
    skipped = []
    
    # Import here to avoid circular dependency
    from data.countries import get_random_gps
    
    for config_idx, config in enumerate(configs):
        country = config.get("country", {})
        make = config.get("make", "")
        model = config.get("model", "")
        dt = config.get("datetime", generate_random_datetime())
        
        # Create output folder: CountryName_YYYYMMDD_HHMMSS
        country_name = country.get("name_cn", country.get("name", "Unknown"))
        # Sanitize folder name
        safe_name = "".join(c for c in country_name if c.isalnum() or c in (' ', '_', '-', '(', ')')).strip()
        if not safe_name:
            safe_name = country.get("code", "Unknown")
        
        folder_name = f"{safe_name}_{dt.replace(':', '').replace(' ', '_')}"
        folder_path = os.path.join(output_dir, folder_name)
        os.makedirs(folder_path, exist_ok=True)
        
        for image_path in image_paths:
            current += 1
            
            try:
                if not os.path.exists(image_path):
                    skipped.append((config_idx, image_path, "File not found"))
                    continue
                
                if not _is_jpeg(image_path):
                    skipped.append((config_idx, image_path, "Not JPEG"))
                    continue
                
                # Get random GPS within country
                lat, lng = get_random_gps(country)
                
                output_filename = os.path.basename(image_path)
                output_path = os.path.join(folder_path, output_filename)
                
                # Handle duplicate filenames
                counter = 1
                while os.path.exists(output_path):
                    name, ext = os.path.splitext(os.path.basename(image_path))
                    output_filename = f"{name}_{counter}{ext}"
                    output_path = os.path.join(folder_path, output_filename)
                    counter += 1
                
                write_exif(image_path, output_path, make, model, dt, lat, lng, user_comment)
                success.append((config_idx, output_path))
                
            except Exception as e:
                logger.error(f"Failed to process {image_path}: {e}")
                skipped.append((config_idx, image_path, str(e)))
            
            if progress_callback:
                progress_callback(current, total)
    
    return success, skipped
