# Full Bloodline deploy: SAM backend + frontend
# Usage: .\deploy.ps1

Set-Location $PSScriptRoot

# Ensure Python 3.13 (the Lambda runtime) is on PATH so `sam build` can find it.
$py313 = @(
    "$env:LOCALAPPDATA\Programs\Python\Python313",
    "C:\Python313",
    "$env:ProgramFiles\Python313"
) | Where-Object { Test-Path "$_\python.exe" } | Select-Object -First 1
if ($py313) {
    $env:PATH = "$py313;$env:PATH"
    Write-Host "Using Python 3.13 at $py313" -ForegroundColor DarkGray
} else {
    Write-Host "WARNING: Python 3.13 not found on this machine - sam build may fail." -ForegroundColor Yellow
}

# 1. Build and deploy SAM stack
Write-Host "Deploying SAM stack..." -ForegroundColor Cyan
sam build

# 2. Grab outputs from CloudFormation
$outputs = aws cloudformation describe-stacks --stack-name bloodline-dev `
    --query "Stacks[0].Outputs" | ConvertFrom-Json

$bucket   = ($outputs | Where-Object { $_.OutputKey -eq "FrontendBucketName" }).OutputValue
$cfDomain = ($outputs | Where-Object { $_.OutputKey -eq "FrontendUrl" }).OutputValue -replace "https://", ""
$distId   = (aws cloudfront list-distributions --query "DistributionList.Items[?DomainName=='$cfDomain'].Id" --output text)

Write-Host "Frontend bucket: $bucket" -ForegroundColor Cyan

# 3. Build and sync frontend
Write-Host "Building frontend..." -ForegroundColor Cyan
Set-Location frontend
npm install
npm run build
aws s3 sync dist/ "s3://$bucket/" --delete
Set-Location ..

# 4. Invalidate CloudFront cache
if ($distId) {
    Write-Host "Invalidating CloudFront cache..." -ForegroundColor Cyan
    aws cloudfront create-invalidation --distribution-id $distId --paths "/*"
}

Write-Host ""
Write-Host "Deploy complete!" -ForegroundColor Green
Write-Host "App URL: $(($outputs | Where-Object { $_.OutputKey -eq 'FrontendUrl' }).OutputValue)" -ForegroundColor White
