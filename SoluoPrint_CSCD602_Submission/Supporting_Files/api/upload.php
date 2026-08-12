<?php
/**
 * Image Upload Handler for Job List
 * Saves to: uploads/joblist/{company_id}/
 * Compresses images > 10MB using GD library
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Handle CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// === DELETE: Remove an image ===
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    $filePath = $input['path'] ?? '';

    if (!$filePath) {
        echo json_encode(['success' => false, 'error' => 'No path provided']);
        exit;
    }

    // Security: Only allow deletion within uploads/joblist/
    $fullPath = realpath(__DIR__ . '/../uploads/joblist/' . $filePath);
    $allowedDir = realpath(__DIR__ . '/../uploads/joblist');

    if (!$fullPath || strpos($fullPath, $allowedDir) !== 0) {
        echo json_encode(['success' => false, 'error' => 'Invalid path']);
        exit;
    }

    if (file_exists($fullPath)) {
        unlink($fullPath);
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => 'File not found']);
    }
    exit;
}

// === POST: Upload images ===
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$companyId = $_POST['company_id'] ?? '';
if (!$companyId) {
    echo json_encode(['success' => false, 'error' => 'company_id is required']);
    exit;
}

// Create company directory if it doesn't exist
$uploadDir = __DIR__ . '/../uploads/joblist/' . $companyId . '/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$maxSize = 10 * 1024 * 1024; // 10MB threshold for compression
$maxWidth = 2000;  // Max dimension after compression
$maxHeight = 2000;
$jpegQuality = 75; // JPEG quality for compressed images

$uploaded = [];
$errors = [];

if (!isset($_FILES['images'])) {
    echo json_encode(['success' => false, 'error' => 'No files uploaded']);
    exit;
}

$files = $_FILES['images'];
$fileCount = is_array($files['name']) ? count($files['name']) : 1;

for ($i = 0; $i < $fileCount; $i++) {
    $name = is_array($files['name']) ? $files['name'][$i] : $files['name'];
    $tmpName = is_array($files['tmp_name']) ? $files['tmp_name'][$i] : $files['tmp_name'];
    $size = is_array($files['size']) ? $files['size'][$i] : $files['size'];
    $error = is_array($files['error']) ? $files['error'][$i] : $files['error'];

    if ($error !== UPLOAD_ERR_OK) {
        $errors[] = "Upload error for $name: code $error";
        continue;
    }

    // Validate file type
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $tmpName);
    finfo_close($finfo);

    $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'application/pdf', 'image/tiff'];
    if (!in_array($mimeType, $allowedTypes)) {
        $errors[] = "Invalid file type for $name: $mimeType";
        continue;
    }

    // Generate unique filename
    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    $uniqueName = time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
    $destPath = $uploadDir . $uniqueName;

    // Check if compression is needed (> 10MB) - only for web images
    $isWebImage = in_array($mimeType, ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']);
    if ($size > $maxSize && $isWebImage) {
        $compressed = compressImage($tmpName, $destPath, $mimeType, $maxWidth, $maxHeight, $jpegQuality);
        if (!$compressed) {
            // Fallback: just move the file
            move_uploaded_file($tmpName, $destPath);
        }
    } else {
        move_uploaded_file($tmpName, $destPath);
    }

    // Dynamically determine the base URL path
    $basePath = dirname($_SERVER['SCRIPT_NAME'], 2);
    if ($basePath === '/' || $basePath === '\\') $basePath = '';

    // Build the public URL path
    $relativePath = $companyId . '/' . $uniqueName;
    $uploaded[] = [
        'path' => $relativePath,
        'url' => $basePath . '/uploads/joblist/' . $relativePath,
        'name' => $name,
        'size' => filesize($destPath),
        'original_size' => $size
    ];
}

echo json_encode([
    'success' => true,
    'uploaded' => $uploaded,
    'errors' => $errors
]);

/**
 * Compress and resize an image using GD library
 */
function compressImage($source, $destination, $mimeType, $maxW, $maxH, $quality) {
    // Load the image based on type
    switch ($mimeType) {
        case 'image/jpeg':
            $img = @imagecreatefromjpeg($source);
            break;
        case 'image/png':
            $img = @imagecreatefrompng($source);
            break;
        case 'image/gif':
            $img = @imagecreatefromgif($source);
            break;
        case 'image/webp':
            $img = @imagecreatefromwebp($source);
            break;
        case 'image/bmp':
            $img = @imagecreatefrombmp($source);
            break;
        default:
            return false;
    }

    if (!$img) return false;

    $origW = imagesx($img);
    $origH = imagesy($img);

    // Calculate new dimensions (maintain aspect ratio)
    $ratio = min($maxW / $origW, $maxH / $origH, 1);
    $newW = (int)($origW * $ratio);
    $newH = (int)($origH * $ratio);

    // Create resized image
    $resized = imagecreatetruecolor($newW, $newH);

    // Preserve transparency for PNG
    if ($mimeType === 'image/png') {
        imagealphablending($resized, false);
        imagesavealpha($resized, true);
    }

    imagecopyresampled($resized, $img, 0, 0, 0, 0, $newW, $newH, $origW, $origH);

    // Save as JPEG for maximum compression (change extension to .jpg)
    $jpgDest = preg_replace('/\.[^.]+$/', '.jpg', $destination);
    $result = imagejpeg($resized, $jpgDest, $quality);

    // If the destination was different, remove old and update path
    if ($jpgDest !== $destination && file_exists($destination)) {
        unlink($destination);
    }

    imagedestroy($img);
    imagedestroy($resized);

    // Rename destination to the jpg version
    if ($jpgDest !== $destination) {
        rename($jpgDest, preg_replace('/\.[^.]+$/', '.jpg', $destination));
    }

    return $result;
}
