<?php
// hubtelpayment.php
// Place this at the root of your project and run via a PHP server (e.g., XAMPP, Laragon, or php -S localhost:8000)

header('Content-Type: application/json');

// =========================================================================
// CONFIGURATION - Replace these with your actual Hubtel credentials for testing
// =========================================================================
$clientId = 'wl0nmz';
$clientSecret = '338674d5f67b440d98cf9318b65f6081';
$merchantAccountNumber = '2039635';

// The Authorization header uses Base64 encoded 'clientId:clientSecret'
$authBase64 = base64_encode($clientId . ':' . $clientSecret);
$authHeader = 'Authorization: Basic ' . $authBase64;

// Basic routing using query parameters (e.g., ?action=initiate or ?action=status&ref=inv0012)
$action = isset($_GET['action']) ? $_GET['action'] : 'initiate';

if ($action === 'initiate') {
    // 1. INITIATE CHECKOUT
    $curl = curl_init();
    
    // Generate a random client reference for this test
    $clientReference = 'test_inv_' . time();
    
    $payload = array(
        "totalAmount" => 1.00, // Must be float / 2 decimal places
        "description" => "1 Cedi Live Payment Test",
        "title" => "SoluoPrint Test", // Hubtel sometimes requires this based on older docs, good to include
        "callbackUrl" => "https://webhook.site/your-webhook-uuid", // Change to a real webhook site to inspect callback
        "returnUrl" => "http://localhost/hubtelpayment.php?action=status&ref=" . $clientReference,
        "cancellationUrl" => "http://localhost/hubtelpayment.php?action=cancelled",
        "merchantAccountNumber" => $merchantAccountNumber,
        "clientReference" => $clientReference
    );

    curl_setopt_array($curl, array(
        CURLOPT_URL => 'https://payproxyapi.hubtel.com/items/initiate',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_ENCODING => '',
        CURLOPT_MAXREDIRS => 10,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST => 'POST',
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_HTTPHEADER => array(
            'Content-Type: application/json',
            $authHeader
        ),
    ));

    $response = curl_exec($curl);
    $err = curl_error($curl);
    curl_close($curl);

    if ($err) {
        echo json_encode(['error' => 'cURL Error: ' . $err]);
    } else {
        // Echo exactly what Hubtel returned
        echo $response;
    }

} elseif ($action === 'status') {
    // 2. CHECK TRANSACTION STATUS
    $ref = isset($_GET['ref']) ? $_GET['ref'] : '';
    
    if (empty($ref)) {
        echo json_encode(['error' => 'Missing ?ref= parameter for status check']);
        exit;
    }

    $curl = curl_init();
    
    // Note: The status URL requires the Merchant Account Number in the URL path
    $statusUrl = 'https://api-txnstatus.hubtel.com/transactions/' . urlencode($merchantAccountNumber) . '/status?clientReference=' . urlencode($ref);

    curl_setopt_array($curl, array(
        CURLOPT_URL => $statusUrl,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_ENCODING => '',
        CURLOPT_MAXREDIRS => 10,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST => 'GET',
        CURLOPT_HTTPHEADER => array(
            'Content-Type: application/json',
            $authHeader
        ),
    ));

    $response = curl_exec($curl);
    $err = curl_error($curl);
    curl_close($curl);

    if ($err) {
        echo json_encode(['error' => 'cURL Error: ' . $err]);
    } else {
        // Echo exactly what Hubtel returned
        echo $response;
    }

} else {
    echo json_encode(['error' => 'Invalid action. Use ?action=initiate or ?action=status&ref=...']);
}
