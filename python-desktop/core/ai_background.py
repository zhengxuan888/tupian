# AI Background - Industrial Grade
# Remove background and generate new AI backgrounds

import os
import logging
import requests
import time
import threading
from PIL import Image

logger = logging.getLogger(__name__)

# Check Pillow version for Resampling compatibility
def _check_pillow_resampling():
    """Get the correct resampling constant for Pillow"""
    try:
        return Image.Resampling.LANCZOS
    except AttributeError:
        return Image.LANCZOS

RESAMPLING = _check_pillow_resampling()

# Pollinations AI free API
POLLINATIONS_URL = "https://image.pollinations.ai/prompt/{prompt}?width={width}&height={height}&seed={seed}&nologo=true"

# Preset background prompts
PRESET_BACKGROUNDS = [
    {"name": "Beach Sunset", "name_cn": "海滩日落", "prompt": "beautiful tropical beach at golden hour sunset, palm trees, crystal clear water, warm lighting, professional photography"},
    {"name": "City Skyline", "name_cn": "城市天际线", "prompt": "modern city skyline at dusk, glass buildings reflecting light, professional urban photography"},
    {"name": "Forest", "name_cn": "森林", "prompt": "lush green forest with sunbeams through trees, misty morning atmosphere, nature photography"},
    {"name": "Mountain Lake", "name_cn": "山湖", "prompt": "serene mountain lake with snow-capped peaks reflection, crystal clear water, landscape photography"},
    {"name": "Studio", "name_cn": "摄影棚", "prompt": "professional photography studio background, seamless gradient, soft studio lighting, clean minimal"},
    {"name": "Garden", "name_cn": "花园", "prompt": "beautiful flower garden in spring, colorful roses and tulips, soft bokeh background, garden photography"},
    {"name": "Street", "name_cn": "街头", "prompt": "urban street scene with artistic bokeh, city lights, cinematic atmosphere, street photography"},
    {"name": "Snow", "name_cn": "雪景", "prompt": "peaceful winter snow landscape, soft falling snow, cold blue tones, winter photography"},
    {"name": "Desert", "name_cn": "沙漠", "prompt": "vast desert landscape with sand dunes, golden hour warm light, dramatic sky, landscape photography"},
    {"name": "Underwater", "name_cn": "水下", "prompt": "underwater ocean scene with coral reef, tropical fish, blue water with light rays, underwater photography"},
    {"name": "Space", "name_cn": "太空", "prompt": "deep space nebula with colorful stars and galaxies, cosmic background, astrophotography"},
    {"name": "Japanese Garden", "name_cn": "日式庭院", "prompt": "traditional Japanese zen garden with cherry blossoms, stone lantern, peaceful atmosphere"},
]


class CancellationError(Exception):
    """Raised when an operation is cancelled"""
    pass


def _check_cancel(cancel_event):
    """Check if operation was cancelled"""
    if cancel_event and cancel_event.is_set():
        raise CancellationError("Operation cancelled")


def remove_background(input_path, output_path=None, cancel_event=None):
    """Remove background from image using rembg
    
    Args:
        input_path: Input image path
        output_path: Output path (None for auto-generated)
        cancel_event: threading.Event for cancellation
    
    Returns:
        str: Output file path, or None on failure/cancellation
    """
    _check_cancel(cancel_event)
    
    try:
        import rembg
    except ImportError:
        logger.error("rembg not installed. Install with: pip install rembg")
        return None
    
    if not os.path.exists(input_path):
        logger.error(f"Input file not found: {input_path}")
        return None
    
    if output_path is None:
        base, ext = os.path.splitext(input_path)
        output_path = f"{base}_nobg.png"
    
    try:
        _check_cancel(cancel_event)
        logger.info(f"Removing background: {input_path}")
        
        input_img = Image.open(input_path)
        output_img = rembg.remove(input_img)
        
        _check_cancel(cancel_event)
        
        # Ensure output directory exists
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        output_img.save(output_path, "PNG")
        
        logger.info(f"Background removed: {output_path}")
        return output_path
        
    except CancellationError:
        logger.info("Background removal cancelled")
        return None
    except Exception as e:
        logger.error(f"Background removal failed: {e}")
        return None


def generate_background(prompt, output_path, width=1024, height=1024, seed=None, cancel_event=None, max_retries=3):
    """Generate background image using Pollinations AI
    
    Args:
        prompt: Text description of the background
        output_path: Output file path
        width: Image width
        height: Image height
        seed: Random seed (None for random)
        cancel_event: threading.Event for cancellation
        max_retries: Maximum number of retry attempts
    
    Returns:
        str: Output file path, or None on failure
    """
    import random as rnd
    
    if seed is None:
        seed = rnd.randint(0, 999999)
    
    url = POLLINATIONS_URL.format(
        prompt=requests.utils.quote(prompt),
        width=width,
        height=height,
        seed=seed
    )
    
    # Ensure output directory exists
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    
    for attempt in range(max_retries):
        try:
            _check_cancel(cancel_event)
            
            if attempt > 0:
                wait_time = 2 ** attempt
                logger.info(f"Retry {attempt}/{max_retries} after {wait_time}s")
                time.sleep(wait_time)
            
            _check_cancel(cancel_event)
            logger.info(f"Generating background (attempt {attempt + 1}): {prompt[:50]}...")
            
            response = requests.get(url, timeout=120)
            
            _check_cancel(cancel_event)
            
            if response.status_code == 200 and len(response.content) > 1000:
                with open(output_path, 'wb') as f:
                    f.write(response.content)
                logger.info(f"Background generated: {output_path}")
                return output_path
            else:
                logger.warning(f"Bad response: status={response.status_code}, size={len(response.content)}")
                
        except CancellationError:
            logger.info("Background generation cancelled")
            return None
        except Exception as e:
            logger.error(f"Background generation failed (attempt {attempt + 1}): {e}")
    
    logger.error(f"Background generation failed after {max_retries} attempts")
    return None


def generate_from_local(image_path, output_path, cancel_event=None):
    """Use a local image as background (resize to match foreground)
    
    Args:
        image_path: Local background image path
        output_path: Output path
        cancel_event: threading.Event for cancellation
    
    Returns:
        str: Output file path, or None on failure
    """
    try:
        _check_cancel(cancel_event)
        
        if not os.path.exists(image_path):
            logger.error(f"Local background not found: {image_path}")
            return None
        
        bg_img = Image.open(image_path)
        
        _check_cancel(cancel_event)
        
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        bg_img.save(output_path)
        
        logger.info(f"Local background prepared: {output_path}")
        return output_path
        
    except CancellationError:
        return None
    except Exception as e:
        logger.error(f"Local background failed: {e}")
        return None


def composite_images(foreground_path, background_path, output_path, cancel_event=None):
    """Composite foreground (with alpha) onto background
    
    Args:
        foreground_path: Foreground image path (PNG with alpha channel)
        background_path: Background image path
        output_path: Output file path
        cancel_event: threading.Event for cancellation
    
    Returns:
        str: Output file path, or None on failure
    """
    try:
        _check_cancel(cancel_event)
        
        # Load foreground
        foreground = Image.open(foreground_path).convert("RGBA")
        
        _check_cancel(cancel_event)
        
        # Load and resize background to match foreground
        background = Image.open(background_path).convert("RGBA")
        background = background.resize(foreground.size, RESAMPLING)
        
        _check_cancel(cancel_event)
        
        # Composite
        result = Image.alpha_composite(background, foreground)
        
        # Convert to RGB for JPEG output
        if output_path.lower().endswith(('.jpg', '.jpeg')):
            result = result.convert("RGB")
        
        _check_cancel(cancel_event)
        
        # Ensure output directory exists
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        result.save(output_path)
        
        logger.info(f"Composite complete: {output_path}")
        return output_path
        
    except CancellationError:
        return None
    except Exception as e:
        logger.error(f"Composite failed: {e}")
        return None
