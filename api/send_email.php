<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

$to = $input['to'] ?? '';
$subject = $input['subject'] ?? 'Notification from SoluoPrint';
$message = $input['message'] ?? '';
$senderName = $input['sender_name'] ?? 'SoluoPrint';

if (!$to || !$message) {
    echo json_encode(['success' => false, 'error' => 'Missing required fields (to, message)']);
    exit;
}

// Namecheap SMTP Details
$smtp_server = 'Add-Your-SMTP-Email-Account';
$smtp_port = 465;
$smtp_user = 'Your-Email-Account';
$smtp_pass = 'Email-Password';

// A simple function to send email via SMTP socket in PHP without PHPMailer
function send_smtp_mail($to, $subject, $message, $senderName, $smtp_server, $smtp_port, $smtp_user, $smtp_pass) {
    $crlf = "\r\n";
    $headers = "From: \"$senderName\" <$smtp_user>$crlf" .
               "To: $to$crlf" .
               "Subject: $subject$crlf" .
               "MIME-Version: 1.0$crlf" .
               "Content-Type: text/html; charset=UTF-8$crlf";

    $smtp = fsockopen("ssl://" . $smtp_server, $smtp_port, $errno, $errstr, 15);
    if (!$smtp) return "Failed to connect to SMTP server: $errstr";

    stream_set_timeout($smtp, 15);
    $res = fgets($smtp, 515);

    fputs($smtp, "EHLO localhost$crlf");
    $res = fgets($smtp, 515); // should be 250

    fputs($smtp, "AUTH LOGIN$crlf");
    $res = fgets($smtp, 515);

    fputs($smtp, base64_encode($smtp_user) . $crlf);
    $res = fgets($smtp, 515);

    fputs($smtp, base64_encode($smtp_pass) . $crlf);
    $res = fgets($smtp, 515); // should be 235 Authentication successful

    if (substr($res, 0, 3) != '235') {
        fclose($smtp);
        return "SMTP Auth Failed";
    }

    fputs($smtp, "MAIL FROM: <$smtp_user>$crlf");
    $res = fgets($smtp, 515);

    fputs($smtp, "RCPT TO: <$to>$crlf");
    $res = fgets($smtp, 515);

    fputs($smtp, "DATA$crlf");
    $res = fgets($smtp, 515);

    fputs($smtp, $headers . $crlf . $message . $crlf . ".$crlf");
    $res = fgets($smtp, 515); // should be 250 Message accepted for delivery

    fputs($smtp, "QUIT$crlf");
    fclose($smtp);

    if (substr($res, 0, 3) != '250') return "Failed to send email data: " . $res;

    return true;
}

$result = send_smtp_mail($to, $subject, $message, $senderName, $smtp_server, $smtp_port, $smtp_user, $smtp_pass);

if ($result === true) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'error' => $result]);
}
