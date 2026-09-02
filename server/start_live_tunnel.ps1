# PragatiDesk Live HTTPS Tunnel Daemon
Write-Host "Starting PragatiDesk Public HTTPS Tunnel..." -ForegroundColor Cyan

while ($true) {
    try {
        ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -R 80:localhost:5050 nokey@localhost.run
    } catch {
        Write-Host "Tunnel interrupted. Reconnecting in 3 seconds..." -ForegroundColor Yellow
        Start-Sleep -Seconds 3
    }
}
