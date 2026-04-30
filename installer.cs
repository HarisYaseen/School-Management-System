// SMS Installer v1.1 - Hardened Version
using System;
using System.IO;
using System.IO.Compression;
using System.Diagnostics;
using System.Reflection;
using System.Threading;
using System.Security.Cryptography;

class SMSInstaller {

    static string AppName = "SMS Connect";
    static string FolderName = "SMSConnect";
    static string ExeName = "SMS Connect.exe";

    static void Main() {
        Console.Title = AppName + " Installer";
        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine("========================================");
        Console.WriteLine("  " + AppName + " Official Installer");
        Console.WriteLine("========================================");
        Console.ResetColor();

        bool success = false;

        try {
            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string installPath = Path.Combine(localAppData, FolderName);
            // Normalize to prevent path confusion
            installPath = Path.GetFullPath(installPath);

            // 1. Kill existing process if running
            Console.WriteLine("[+] Checking for running instances...");
            KillExistingProcesses();

            // 2. Clean up previous installation
            if (Directory.Exists(installPath)) {
                Console.WriteLine("[!] Previous version found. Updating...");
                for (int i = 0; i < 3; i++) {
                    try {
                        Directory.Delete(installPath, true);
                        break;
                    } catch (Exception ex) {
                        Console.WriteLine("[!] Retry " + (i+1) + ": " + ex.Message);
                        Thread.Sleep(1000);
                    }
                }
            }

            Directory.CreateDirectory(installPath);
            Console.WriteLine("[+] Destination: " + installPath);

            // 3. Load zip stream
            Assembly assembly = Assembly.GetExecutingAssembly();
            using (Stream zipStream = assembly.GetManifestResourceStream("app.zip")) {
                if (zipStream == null) {
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.WriteLine("\n[!] Error: Application package (app.zip) not found inside the installer.");
                    Console.ReadKey();
                    return;
                }

                // 4. Verify SHA256 checksum before extracting
                Console.WriteLine("[+] Verifying package integrity...");
                byte[] zipBytes;
                using (MemoryStream ms = new MemoryStream()) {
                    zipStream.CopyTo(ms);
                    zipBytes = ms.ToArray();
                }

                // Load expected hash from embedded resource (app.zip.sha256)
                string expectedHash = null;
                using (Stream hashStream = assembly.GetManifestResourceStream("app.zip.sha256")) {
                    if (hashStream != null) {
                        using (StreamReader reader = new StreamReader(hashStream)) {
                            expectedHash = reader.ReadToEnd().Trim().ToLowerInvariant();
                        }
                    }
                }

                if (expectedHash != null) {
                    string actualHash;
                    using (SHA256 sha256 = SHA256.Create()) {
                        actualHash = BitConverter.ToString(sha256.ComputeHash(zipBytes))
                            .Replace("-", "").ToLowerInvariant();
                    }
                    if (actualHash != expectedHash) {
                        Console.ForegroundColor = ConsoleColor.Red;
                        Console.WriteLine("\n[!] SECURITY ERROR: Package integrity check failed! Installation aborted.");
                        Console.ReadKey();
                        return;
                    }
                    Console.WriteLine("[+] Integrity check passed.");
                } else {
                    Console.WriteLine("[!] Warning: No checksum file found, skipping integrity check.");
                }

                // 5. Extract files with path traversal protection
                Console.WriteLine("[+] Installing files (this may take a minute)...");
                using (MemoryStream ms = new MemoryStream(zipBytes))
                using (ZipArchive archive = new ZipArchive(ms, ZipArchiveMode.Read)) {
                    int total = archive.Entries.Count;
                    int count = 0;

                    foreach (ZipArchiveEntry entry in archive.Entries) {
                        // PATH TRAVERSAL PROTECTION
                        string fullPath = Path.GetFullPath(Path.Combine(installPath, entry.FullName));
                        if (!fullPath.StartsWith(installPath + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)) {
                            Console.WriteLine("\n[!] WARNING: Skipping suspicious path: " + entry.FullName);
                            continue;
                        }

                        string dirPath = Path.GetDirectoryName(fullPath);
                        if (!Directory.Exists(dirPath)) Directory.CreateDirectory(dirPath);

                        if (!string.IsNullOrEmpty(entry.Name)) {
                            entry.ExtractToFile(fullPath, true);
                        }

                        count++;
                        if (count % 20 == 0 || count == total) {
                            int percent = (int)((float)count / total * 100);
                            Console.Write("\r[+] Progress: " + percent + "% [" + count + "/" + total + " files]");
                        }
                    }
                }
            }

            // 6. Create Desktop Shortcut
            Console.WriteLine("\n[+] Creating desktop shortcut...");
            CreateDesktopShortcut(Path.Combine(installPath, ExeName));

            // 7. Launch app
            string appExe = Path.Combine(installPath, ExeName);
            if (File.Exists(appExe)) {
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("\n[SUCCESS] " + AppName + " installed successfully.");
                Console.WriteLine("[+] Launching application...");
                ProcessStartInfo startInfo = new ProcessStartInfo(appExe) {
                    WorkingDirectory = installPath
                };
                Process.Start(startInfo);
                success = true;
            }

        } catch (Exception ex) {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("\n[!] CRITICAL ERROR: " + ex.Message);
        }

        Console.ResetColor();

        // Only pause on failure so user can read the error
        if (!success) {
            Console.WriteLine("\nInstallation failed. Press any key to close...");
            Console.ReadKey();
        } else {
            Console.WriteLine("\nInstallation complete. Closing in 3 seconds...");
            Thread.Sleep(3000);
        }
    }

    static void KillExistingProcesses() {
        string procName = Path.GetFileNameWithoutExtension(ExeName);
        foreach (var process in Process.GetProcessesByName(procName)) {
            try {
                process.Kill();
                process.WaitForExit(3000);
            } catch (Exception ex) {
                Console.WriteLine("[!] Could not kill process: " + ex.Message);
            }
        }
    }

    static void CreateDesktopShortcut(string targetPath) {
        try {
            string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
            string shortcutLocation = Path.Combine(desktopPath, AppName + ".lnk");

            // POWERSHELL INJECTION FIX: escape single quotes in paths
            string safeTarget = targetPath.Replace("'", "''");
            string safeWorking = Path.GetDirectoryName(targetPath).Replace("'", "''");
            string safeShortcut = shortcutLocation.Replace("'", "''");

            string script = $"$WshShell = New-Object -ComObject WScript.Shell; " +
                            $"$Shortcut = $WshShell.CreateShortcut('{safeShortcut}'); " +
                            $"$Shortcut.TargetPath = '{safeTarget}'; " +
                            $"$Shortcut.WorkingDirectory = '{safeWorking}'; " +
                            $"$Shortcut.Save()";

            ProcessStartInfo psi = new ProcessStartInfo("powershell", $"-Command \"{script}\"") {
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden
            };
            Process.Start(psi).WaitForExit();

        } catch (Exception ex) {
            Console.WriteLine("[!] Shortcut Error: " + ex.Message);
        }
    }
}
