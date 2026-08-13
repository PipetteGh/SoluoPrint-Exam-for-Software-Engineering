<?php
/**
 * Binary File Download Proxy Handler for SoluoPrint
 * Streams exact file contents with proper Content-Type and Content-Disposition headers.
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 1. Get raw input parameters from GET or POST
$rawUrl = $_REQUEST['file'] ?? $_REQUEST['url'] ?? '';
$filename = $_REQUEST['name'] ?? $_REQUEST['filename'] ?? '';

if (!$rawUrl) {
    // Check JSON body for POST request
    $input = json_decode(file_get_contents('php://input'), true);
    if ($input) {
        $rawUrl = $input['file'] ?? $input['url'] ?? '';
        $filename = $input['name'] ?? $input['filename'] ?? '';
    }
}

if (!$rawUrl) {
    http_response_code(400);
    echo 'Error: No file parameter provided.';
    exit;
}

// 2. Handle Data URLs (data:mime/type;base64,...)
if (strpos($rawUrl, 'data:') === 0) {
    // Clean custom parameters like ;name=...
    $cleanDataUrl = preg_replace('/;name=[^;]+;/', ';', $rawUrl);
    
    if (preg_match('/^data:([^;]+);base64,(.*)$/s', $cleanDataUrl, $matches)) {
        $mimeType = $matches[1];
        $base64Data = $matches[2];
        $binaryData = base64_decode($base64Data);

        if (!$filename) {
            $ext = 'bin';
            if (strpos($mimeType, 'pdf') !== false) $ext = 'pdf';
            elseif (strpos($mimeType, 'png') !== false) $ext = 'png';
            elseif (strpos($mimeType, 'jpeg') !== false || strpos($mimeType, 'jpg') !== false) $ext = 'jpg';
            elseif (strpos($mimeType, 'webp') !== false) $ext = 'webp';
            $filename = 'download_' . date('Y-m-d_H-i-s') . '.' . $ext;
        }

        // Sanitize filename for headers
        $cleanFilename = basename($filename);

        header('Content-Description: File Transfer');
        header('Content-Type: ' . $mimeType);
        header('Content-Disposition: attachment; filename="' . $cleanFilename . '"');
        header('Content-Transfer-Encoding: binary');
        header('Expires: 0');
        header('Cache-Control: must-revalidate');
        header('Pragma: public');
        header('Content-Length: ' . strlen($binaryData));

        echo $binaryData;
        exit;
    }
}

// 3. Handle local server files inside uploads/ directory
$uploadsDir = realpath(__DIR__ . '/../uploads');
$relativeFile = ltrim(parse_url($rawUrl, PHP_URL_PATH), '/');
$possibleLocalPath = realpath(__DIR__ . '/../' . $relativeFile);

if ($possibleLocalPath && $uploadsDir && strpos($possibleLocalPath, $uploadsDir) === 0 && file_exists($possibleLocalPath)) {
    $mimeType = mime_content_type($possibleLocalPath) ?: 'application/octet-stream';
    if (!$filename) {
        $filename = basename($possibleLocalPath);
    }
    $cleanFilename = basename($filename);

    header('Content-Description: File Transfer');
    header('Content-Type: ' . $mimeType);
    header('Content-Disposition: attachment; filename="' . $cleanFilename . '"');
    header('Content-Transfer-Encoding: binary');
    header('Expires: 0');
    header('Cache-Control: must-revalidate');
    header('Pragma: public');
    header('Content-Length: ' . filesize($possibleLocalPath));

    readfile($possibleLocalPath);
    exit;
}

// 4. Handle external HTTP/HTTPS URLs by streaming binary response
if (filter_var($rawUrl, FILTER_VALIDATE_URL)) {
    $fileContent = @file_get_contents($rawUrl);
    if ($fileContent !== false) {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_buffer($finfo, $fileContent) ?: 'application/octet-stream';
        finfo_close($finfo);

        if (!$filename) {
            $filename = basename(parse_url($rawUrl, PHP_URL_PATH)) ?: 'download.bin';
        }
        $cleanFilename = basename($filename);

        header('Content-Description: File Transfer');
        header('Content-Type: ' . $mimeType);
        header('Content-Disposition: attachment; filename="' . $cleanFilename . '"');
        header('Content-Transfer-Encoding: binary');
        header('Expires: 0');
        header('Cache-Control: must-revalidate');
        header('Pragma: public');
        header('Content-Length: ' . strlen($fileContent));

        echo $fileContent;
        exit;
    }
}

http_response_code(404);
echo 'Error: Unable to locate or stream file.';
exit;
