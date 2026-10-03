param(
  [switch]$All
)

# Only stops the Next.js dev server. Matching every node process in the project
# would also kill the embedded Postgres, which runs under a tsx wrapper here.
function Stop-DevServer {
  $targets = Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
    Where-Object { $_.CommandLine -match 'next(\.js)?\s+dev|next-server|\\next\\dist\\bin' }

  if (-not $targets) {
    Write-Host "No dev server running."
    return
  }

  foreach ($target in $targets) {
    Write-Host "Stopping dev server (PID $($target.ProcessId))"
    Stop-Process -Id $target.ProcessId -Force -ErrorAction SilentlyContinue
  }
}

if ($All) {
  Write-Host "Stopping the local database too."
  npx tsx prisma/local-db.ts stop
}

Stop-DevServer