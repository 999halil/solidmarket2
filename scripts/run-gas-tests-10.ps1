param(
    [string]$TestFile = ".\test\MarketplaceTwoGas.js",
    [int]$Runs = 10
)

if (!(Test-Path $TestFile)) {
    Write-Host "ERROR: Test file not found: $TestFile" -ForegroundColor Red
    exit 1
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$testName = [System.IO.Path]::GetFileNameWithoutExtension($TestFile)
$outDir = ".\test-results\$testName-$timestamp"

New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$compileLog = Join-Path $outDir "compile-log.txt"
$cleanLog = Join-Path $outDir "gas-results-clean-log.txt"
$rawCsv = Join-Path $outDir "gas-results-raw.csv"
$avgCsv = Join-Path $outDir "gas-results-averages.csv"
$avgMarkdown = Join-Path $outDir "gas-results-averages.md"
$summaryCsv = Join-Path $outDir "run-summary.csv"

"run,group,operation,gasUsed,gasPriceWei,feeEth" | Out-File $rawCsv -Encoding utf8
"run,timestamp,exitCode,logFile" | Out-File $summaryCsv -Encoding utf8
"" | Out-File $cleanLog -Encoding utf8

Write-Host "Compiling contracts..." -ForegroundColor Cyan
$compileOutput = & npx hardhat compile 2>&1
$compileExitCode = $LASTEXITCODE
$compileOutput | Tee-Object -FilePath $compileLog

if ($compileExitCode -ne 0) {
    Write-Host "Compilation failed. Check: $compileLog" -ForegroundColor Red
    exit $compileExitCode
}

Write-Host ""
Write-Host "Running $TestFile $Runs times..." -ForegroundColor Cyan
Write-Host "Results folder: $outDir"

for ($i = 1; $i -le $Runs; $i++) {
    $runTimestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logFile = Join-Path $outDir ("run-{0:D2}-clean.txt" -f $i)

    Write-Host ""
    Write-Host "===== RUN $i / $Runs =====" -ForegroundColor Cyan

    $output = & npx hardhat test $TestFile 2>&1
    $exitCode = $LASTEXITCODE

    $gasLines = $output | Select-String "^GAS_RESULT,"

    "===== RUN $i / $Runs =====" | Out-File $logFile -Encoding utf8
    "===== RUN $i / $Runs =====" | Out-File $cleanLog -Append -Encoding utf8

    if ($gasLines.Count -eq 0) {
        "No GAS_RESULT lines found." | Out-File $logFile -Append -Encoding utf8
        "No GAS_RESULT lines found." | Out-File $cleanLog -Append -Encoding utf8
    } else {
        foreach ($line in $gasLines) {
            $line.Line | Out-File $logFile -Append -Encoding utf8
            $line.Line | Out-File $cleanLog -Append -Encoding utf8
            Write-Host $line.Line
        }
    }

    "$i,$runTimestamp,$exitCode,$logFile" | Out-File $summaryCsv -Append -Encoding utf8

    if ($exitCode -ne 0) {
        Write-Host ""
        Write-Host "Run $i failed. Stopping script." -ForegroundColor Red
        Write-Host "Check log file: $logFile"
        exit $exitCode
    }

    foreach ($line in $gasLines) {
        $parts = $line.Line.Split(",")

        if ($parts.Length -eq 6) {
            $group = $parts[1].Trim()
            $operation = $parts[2].Trim()
            $gasUsed = $parts[3].Trim()
            $gasPriceWei = $parts[4].Trim()
            $feeEth = $parts[5].Trim()

            "$i,$group,$operation,$gasUsed,$gasPriceWei,$feeEth" | Out-File $rawCsv -Append -Encoding utf8
        }
    }
}

Write-Host ""
Write-Host "Calculating averages..." -ForegroundColor Cyan

$data = Import-Csv $rawCsv

if ($data.Count -eq 0) {
    Write-Host "No gas data found. Cannot calculate averages." -ForegroundColor Red
    exit 1
}

$averages = $data |
    Group-Object group, operation |
    ForEach-Object {
        $rows = $_.Group
        $gasValues = $rows | ForEach-Object { [double]$_.gasUsed }

        $avg = ($gasValues | Measure-Object -Average).Average
        $min = ($gasValues | Measure-Object -Minimum).Minimum
        $max = ($gasValues | Measure-Object -Maximum).Maximum

        [PSCustomObject]@{
            group = $rows[0].group
            operation = $rows[0].operation
            runs = $rows.Count
            averageGasUsed = [math]::Round($avg, 2)
            minGasUsed = [int64]$min
            maxGasUsed = [int64]$max
        }
    } |
    Sort-Object group, operation

$averages | Export-Csv $avgCsv -NoTypeInformation -Encoding utf8

"# Gas measurement averages" | Out-File $avgMarkdown -Encoding utf8
"" | Out-File $avgMarkdown -Append -Encoding utf8
"| Group | Operation | Runs | Average gas used | Min | Max |" | Out-File $avgMarkdown -Append -Encoding utf8
"|---|---|---:|---:|---:|---:|" | Out-File $avgMarkdown -Append -Encoding utf8

foreach ($row in $averages) {
    "| $($row.group) | $($row.operation) | $($row.runs) | $($row.averageGasUsed) | $($row.minGasUsed) | $($row.maxGasUsed) |" |
        Out-File $avgMarkdown -Append -Encoding utf8
}

Write-Host ""
Write-Host "Done." -ForegroundColor Green
Write-Host "Results folder: $outDir"
Write-Host "Clean log: $cleanLog"
Write-Host "Raw CSV: $rawCsv"
Write-Host "Average CSV: $avgCsv"
Write-Host "Markdown table: $avgMarkdown"