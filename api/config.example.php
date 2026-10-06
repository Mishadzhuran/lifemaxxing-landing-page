<?php
/**
 * Copy to config.php on the cPanel server (File Manager or SSH).
 * config.php is blocked from web access via .htaccess and should not be committed.
 */
return [
  'SUPABASE_URL' => 'https://wxyoaxyksrxnojnevbgc.supabase.co',
  // Publishable anon key (same as client). Rotate in Supabase if needed.
  'SUPABASE_ANON_KEY' => 'your_anon_key_here',
];
