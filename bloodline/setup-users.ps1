# setup-users.ps1 — Creates test users and assigns them to Cognito groups
# Run after: sam deploy
# Usage: .\setup-users.ps1  (uses Stage=dev by default)
#        .\setup-users.ps1 -Stage prod

param(
    [string]$Stage = "dev"
)

$StackName = "bloodline-$Stage"

Write-Host "Fetching User Pool ID from CloudFormation stack: $StackName" -ForegroundColor Cyan

$UserPoolId = (aws cloudformation describe-stacks `
    --stack-name $StackName `
    --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" `
    --output text)

if (-not $UserPoolId) {
    Write-Host "ERROR: Could not find UserPoolId. Is the stack deployed?" -ForegroundColor Red
    exit 1
}

Write-Host "User Pool: $UserPoolId" -ForegroundColor Green

# ── Helper ───────────────────────────────────────────────────────────────────

function New-CognitoUser {
    param($Email, $TempPassword, $Name, $BloodType, $PostalCode)

    Write-Host "Creating user: $Email" -ForegroundColor Yellow

    aws cognito-idp admin-create-user `
        --user-pool-id $UserPoolId `
        --username $Email `
        --temporary-password $TempPassword `
        --user-attributes `
            Name=email,Value=$Email `
            Name=email_verified,Value=true `
            Name=name,Value=$Name `
            Name="custom:blood_type",Value=$BloodType `
            Name="custom:postal_code",Value=$PostalCode `
        --message-action SUPPRESS | Out-Null

    # Set a permanent password so no forced-reset on first login
    aws cognito-idp admin-set-user-password `
        --user-pool-id $UserPoolId `
        --username $Email `
        --password $TempPassword `
        --permanent | Out-Null

    Write-Host "  Created." -ForegroundColor Green
}

function Add-ToGroup {
    param($Email, $Group)

    aws cognito-idp admin-add-user-to-group `
        --user-pool-id $UserPoolId `
        --username $Email `
        --group-name $Group | Out-Null

    Write-Host "  Added $Email -> $Group" -ForegroundColor Cyan
}

# ── Create users ─────────────────────────────────────────────────────────────

# HSA Admin
New-CognitoUser -Email "admin@bloodline.sg"    -TempPassword "Bloodline2026!" -Name "Dr R. Lim"      -BloodType "O+"  -PostalCode "169854"
Add-ToGroup    -Email "admin@bloodline.sg"    -Group "HSAAdmin"

# HSA Blood Bank staff
New-CognitoUser -Email "bloodbank@bloodline.sg" -TempPassword "Bloodline2026!" -Name "HSA Dhoby Ghaut" -BloodType "O+"  -PostalCode "238823"
Add-ToGroup    -Email "bloodbank@bloodline.sg" -Group "BloodBank"

# Singapore Red Cross staff
New-CognitoUser -Email "src@bloodline.sg"       -TempPassword "Bloodline2026!" -Name "Red Cross SG"   -BloodType "O+"  -PostalCode "308433"
Add-ToGroup    -Email "src@bloodline.sg"       -Group "RedCrossSG"

# Donor — O- (universal donor, surfaces urgency messaging)
New-CognitoUser -Email "donor@bloodline.sg"     -TempPassword "Bloodline2026!" -Name "Alex Tan"       -BloodType "O-"  -PostalCode "530123"

# Donor — A+ (healthy stock, shows green state)
New-CognitoUser -Email "donor2@bloodline.sg"    -TempPassword "Bloodline2026!" -Name "Sarah Ng"       -BloodType "A+"  -PostalCode "310456"

Write-Host ""
Write-Host "Done. Test accounts:" -ForegroundColor Green
Write-Host "  admin@bloodline.sg      / Bloodline2026!  (HSA Admin)"
Write-Host "  bloodbank@bloodline.sg  / Bloodline2026!  (HSA Blood Bank staff)"
Write-Host "  src@bloodline.sg        / Bloodline2026!  (Singapore Red Cross staff)"
Write-Host "  donor@bloodline.sg      / Bloodline2026!  (Donor - O-)"
Write-Host "  donor2@bloodline.sg     / Bloodline2026!  (Donor - A+)"
