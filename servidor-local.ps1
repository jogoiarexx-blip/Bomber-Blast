param([int]$Port=8765)
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback,$Port)
try { $listener.Start() } catch { exit 2 }
$types=@{'.html'='text/html; charset=utf-8';'.js'='application/javascript; charset=utf-8';'.css'='text/css; charset=utf-8';'.png'='image/png';'.wav'='audio/wav';'.txt'='text/plain; charset=utf-8'}
while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $stream=$client.GetStream();$reader=New-Object System.IO.StreamReader($stream);$line=$reader.ReadLine();if(-not $line){$client.Close();continue}
    $parts=$line.Split(' ');$path=[Uri]::UnescapeDataString($parts[1].Split('?')[0]).TrimStart('/');while(($h=$reader.ReadLine()) -ne ''){}
    if([string]::IsNullOrWhiteSpace($path)){$path='index.html'}
    $full=[IO.Path]::GetFullPath((Join-Path $root $path));$safeRoot=[IO.Path]::GetFullPath($root)
    if(-not $full.StartsWith($safeRoot) -or -not (Test-Path $full -PathType Leaf)){$body=[Text.Encoding]::UTF8.GetBytes('404');$head="HTTP/1.1 404 Not Found`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"}
    else{$body=[IO.File]::ReadAllBytes($full);$ext=[IO.Path]::GetExtension($full).ToLower();$mime=$types[$ext];if(-not $mime){$mime='application/octet-stream'};$head="HTTP/1.1 200 OK`r`nContent-Type: $mime`r`nContent-Length: $($body.Length)`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"}
    $hb=[Text.Encoding]::ASCII.GetBytes($head);$stream.Write($hb,0,$hb.Length);$stream.Write($body,0,$body.Length);$stream.Flush()
  }catch{}finally{$client.Close()}
}
