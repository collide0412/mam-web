Add-Type -AssemblyName System.Drawing
foreach ($iconSize in @(192, 512)) {
    $bitmap = New-Object System.Drawing.Bitmap($iconSize, $iconSize)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, 3)
    try {
        $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#276349'))
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $graphics.ScaleTransform($iconSize / 64, $iconSize / 64)
        $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
        $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
        $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
        $path.AddBezier(18, 43, 12, 25, 27, 19, 47, 19)
        $path.AddBezier(47, 19, 47, 38, 38, 50, 22, 42)
        $graphics.DrawPath($pen, $path)
        $graphics.DrawLine($pen, 16, 49, 38, 27)
        $iconPath = Join-Path $PSScriptRoot "../public/icons/icon-$iconSize.png"
        $bitmap.Save([System.IO.Path]::GetFullPath($iconPath), [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
        $pen.Dispose()
        $path.Dispose()
        $graphics.Dispose()
        $bitmap.Dispose()
    }
}
