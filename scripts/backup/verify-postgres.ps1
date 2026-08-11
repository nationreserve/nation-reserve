param([Parameter(Mandatory=$true)][string]$DatabaseUrl,[Parameter(Mandatory=$true)][string]$EvidenceDirectory)
$ErrorActionPreference='Stop';$resolved=[System.IO.Path]::GetFullPath($EvidenceDirectory);New-Item -ItemType Directory -Force -Path $resolved|Out-Null;$stamp=Get-Date -Format 'yyyyMMdd-HHmmss';$dump=Join-Path $resolved "roboworkpool-$stamp.dump";$restore="rwp_restore_verify_$($stamp.Replace('-','_'))";
& pg_dump --format=custom --no-owner --no-acl --file=$dump $DatabaseUrl;if($LASTEXITCODE -ne 0){throw 'pg_dump failed'};& createdb $restore;if($LASTEXITCODE -ne 0){throw 'restore database creation failed'};try{& pg_restore --exit-on-error --no-owner --no-acl --dbname=$restore $dump;if($LASTEXITCODE -ne 0){throw 'pg_restore failed'};$checksum=(Get-FileHash -Algorithm SHA256 -LiteralPath $dump).Hash;[pscustomobject]@{backup=$dump;sha256=$checksum;restoredDatabase=$restore;verifiedAt=(Get-Date).ToUniversalTime().ToString('o')}|ConvertTo-Json}else{& dropdb --if-exists $restore}


