<?php
// Simple PHP test to check if subdomain is working
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$response = array(
    'status' => 'success',
    'message' => 'Subdomain api.triphog.net is accessible',
    'server' => $_SERVER['HTTP_HOST'],
    'timestamp' => date('Y-m-d H:i:s'),
    'next_step' => 'Start Node.js backend'
);

echo json_encode($response, JSON_PRETTY_PRINT);
?>