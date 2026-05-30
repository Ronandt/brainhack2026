# Full Bloodline deploy: SAM backend + frontend to S3
# Usage: .\deploy.ps1

Set-Location $PSScriptRoot

# 1. Build and deploy SAM stack
Write-Host "Deploying SAM stack..." -ForegroundColor Cyan
sam build
sam deploy

# 2. Grab outputs from CloudFormation
$outputs = aws cloudformation describe-stacks --stack-name bloodline-dev `
    --query "Stacks[0].Outputs" | ConvertFrom-Json

$bucket = ($outputs | Where-Object { $_.OutputKey -eq "FrontendBucketName" }).OutputValue
$cfDomain = ($outputs | Where-Object { $_.OutputKey -eq "FrontendUrl" }).OutputValue -replace "https://", ""
$distId = (aws cloudfront list-distributions --query "DistributionList.Items[?DomainName=='$cfDomain'].Id" --output text)

Write-Host "Frontend bucket: $bucket" -ForegroundColor Cyan

# 3. Build and sync frontend
Set-Location frontend
npm install
npm run build
aws s3 sync dist/ "s3://$bucket/" --delete

# 4. Invalidate CloudFront cache
if ($distId) {
    Write-Host "Invalidating CloudFront cache..." -ForegroundColor Cyan
    aws cloudfront create-invalidation --distribution-id $distId --paths "/*"
}

Write-Host "Deploy complete!" -ForegroundColor Green
Set-Location ..
