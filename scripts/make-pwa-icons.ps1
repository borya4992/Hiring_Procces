Add-Type -AssemblyName System.Drawing

function New-HpIcon([int]$size, [string]$path) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.Clear([System.Drawing.Color]::FromArgb(255, 7, 9, 15))

  $pad = [int]($size * 0.08)
  $rect = New-Object System.Drawing.Rectangle $pad, $pad, ($size - 2 * $pad), ($size - 2 * $pad)
  $radius = [int]($size * 0.18)
  $pathObj = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $radius * 2
  $pathObj.AddArc($rect.X, $rect.Y, $d, $d, 180, 90)
  $pathObj.AddArc($rect.Right - $d, $rect.Y, $d, $d, 270, 90)
  $pathObj.AddArc($rect.Right - $d, $rect.Bottom - $d, $d, $d, 0, 90)
  $pathObj.AddArc($rect.X, $rect.Bottom - $d, $d, $d, 90, 90)
  $pathObj.CloseFigure()

  $c1 = [System.Drawing.Color]::FromArgb(255, 255, 46, 151)
  $c2 = [System.Drawing.Color]::FromArgb(255, 106, 92, 255)
  $c3 = [System.Drawing.Color]::FromArgb(255, 46, 197, 255)
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, $c1, $c3, 135
  $blend = New-Object System.Drawing.Drawing2D.ColorBlend 3
  $blend.Colors = @($c1, $c2, $c3)
  $blend.Positions = @(0, 0.5, 1)
  $brush.InterpolationColors = $blend
  $g.FillPath($brush, $pathObj)

  $fontSize = [float]($size * 0.34)
  $font = New-Object System.Drawing.Font "Segoe UI", $fontSize, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = [System.Drawing.StringAlignment]::Center
  $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
  $textRect = New-Object System.Drawing.RectangleF 0, ($size * 0.02), $size, $size
  $g.DrawString("HP", $font, [System.Drawing.Brushes]::White, $textRect, $sf)

  $dir = Split-Path $path
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
  $brush.Dispose()
  $font.Dispose()
}

$root = Split-Path $PSScriptRoot -Parent
New-HpIcon 192 (Join-Path $root "public\icons\icon-192.png")
New-HpIcon 512 (Join-Path $root "public\icons\icon-512.png")
New-HpIcon 180 (Join-Path $root "public\icons\apple-touch-icon.png")
New-HpIcon 32 (Join-Path $root "public\icons\favicon-32.png")
Write-Output "icons written"
