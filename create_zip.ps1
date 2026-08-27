$source = "C:\Users\Admin\.gemini\antigravity\scratch\mrs-solari"
$temp = "C:\Users\Admin\.gemini\antigravity\scratch\mrs-solari-export"
$dest = "C:\Users\Admin\Downloads\MRS_SOLAR_Project.zip"

if (Test-Path $temp) { Remove-Item $temp -Recurse -Force }
New-Item -ItemType Directory -Path $temp | Out-Null

# Copy backend (exclude node_modules)
robocopy "$source\backend" "$temp\backend" /E /XD node_modules | Out-Null

# Copy frontend (exclude node_modules)
robocopy "$source\frontend" "$temp\frontend" /E /XD node_modules | Out-Null

# Remove old zip if exists
if (Test-Path $dest) { Remove-Item $dest -Force }

# Create zip
Compress-Archive -Path "$temp\*" -DestinationPath $dest -Force

# Cleanup temp
Remove-Item $temp -Recurse -Force

Write-Host "ZIP saved to: $dest"
