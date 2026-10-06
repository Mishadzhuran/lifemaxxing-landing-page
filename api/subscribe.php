<?php
/**
 * cPanel-compatible waitlist proxy → Supabase landing-waitlist edge function.
 * Replaces Vercel api/subscribe.js for Apache/LiteSpeed hosting.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  header('Allow: POST');
  echo json_encode(['error' => 'Method not allowed']);
  exit;
}

$configPath = __DIR__ . '/config.php';
$config = is_readable($configPath) ? (require $configPath) : [];

$supabaseUrl = rtrim(
  getenv('SUPABASE_URL')
    ?: ($config['SUPABASE_URL'] ?? 'https://wxyoaxyksrxnojnevbgc.supabase.co'),
  '/'
);
$anonKey =
  getenv('SUPABASE_ANON_KEY')
  ?: ($config['SUPABASE_ANON_KEY'] ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4eW9heHlrc3J4bm9qbmV2YmdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NzI5MzAsImV4cCI6MjA5NjE0ODkzMH0.UiWn3dEnY73jq1SnDHAXKIdpacF1l8FpvudhC6n-mQ8');

$raw = file_get_contents('php://input');
$body = json_decode($raw ?: '', true);
if (!is_array($body)) {
  http_response_code(400);
  echo json_encode(['error' => 'Invalid JSON']);
  exit;
}

$name = isset($body['name']) && is_string($body['name']) ? trim($body['name']) : '';
$email = isset($body['email']) && is_string($body['email']) ? trim($body['email']) : '';
$phone = isset($body['phone']) && is_string($body['phone']) ? trim($body['phone']) : '';
$source =
  isset($body['source']) && is_string($body['source']) && trim($body['source']) !== ''
    ? trim($body['source'])
    : 'founding-member-landing';
$phoneDigits = preg_replace('/\D+/', '', $phone);

if (strlen($name) < 2) {
  http_response_code(400);
  echo json_encode(['error' => 'Invalid name']);
  exit;
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
  http_response_code(400);
  echo json_encode(['error' => 'Invalid email']);
  exit;
}
if (strlen($phoneDigits) < 7) {
  http_response_code(400);
  echo json_encode(['error' => 'Invalid phone']);
  exit;
}

$payload = json_encode([
  'name' => $name,
  'email' => $email,
  'phone' => $phone,
  'source' => $source,
]);

$ch = curl_init($supabaseUrl . '/functions/v1/landing-waitlist');
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => [
    'Authorization: Bearer ' . $anonKey,
    'apikey: ' . $anonKey,
    'Content-Type: application/json',
  ],
  CURLOPT_POSTFIELDS => $payload,
  CURLOPT_TIMEOUT => 20,
]);

$response = curl_exec($ch);
$curlErr = curl_error($ch);
$status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($response === false) {
  http_response_code(502);
  echo json_encode(['error' => 'Subscription service unavailable', 'detail' => $curlErr]);
  exit;
}

$decoded = json_decode($response, true);
if (!is_array($decoded)) {
  $decoded = [];
}

if ($status < 200 || $status >= 300) {
  $outStatus = ($status >= 400 && $status < 500) ? $status : 502;
  http_response_code($outStatus);
  echo json_encode([
    'error' => $decoded['error'] ?? 'Subscription service unavailable',
  ]);
  exit;
}

http_response_code(200);
echo json_encode([
  'ok' => true,
  'already_registered' => !empty($decoded['already_registered']),
  'emailed' => !empty($decoded['emailed']),
  'email_status' => $decoded['email_status'] ?? null,
  'email_error' => $decoded['email_error'] ?? null,
]);
