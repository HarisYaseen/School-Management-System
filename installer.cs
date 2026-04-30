using System;
using System.IO;
using System.IO.Compression;
using System.Diagnostics;
using System.Reflection;
using System.Threading;
using System.Linq;
using System.Security.Cryptography;
using System.Text;

class SMSInstaller {
    static string AppName = "SMS Connect";
    static string FolderName = "SMSConnect";
    static string ExeName = "SMS Connect.exe";
    
    // Expected SHA256 hash of app.zip. 
    // In a production build, this should be updated by the build script.
    static string ExpectedSHA256 = ""; 

    static void Main() {
        Console.Title = AppName + " Installer";
        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine("========================================");
        Console.WriteLine("     " + AppName + " Official Installer");
        Console.WriteLine("========================================");
        Console.ResetColor();

        bool success = false;
        try {
            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string installPath = Path.Combine(localAppData, FolderName);
            installPath = Path.GetFullPath(installPath); // Normalize
            
            // 1. Kill existing process if running
            Console.WriteLine("[+] Checking for running instances...");
            KillExistingProcesses();

            // 2. Clean up previous installation
            if (Directory.Exists(installPath)) {
                Console.WriteLine("[!] Previous version found. Updating...");
                try { 
                    for(int i=0; i<3; i++) {
                        try { Directory.Delete(installPath, true); break; }
                        catch (Exception ex) { 
                            Console.WriteLine("[!] Retry " + (i+1) + "/3: " + ex.Message);
                            Thread.Sleep(1000); 
                        }
                    }
                } catch (Exception ex) { 
                    Console.WriteLine("[!] Warning: Could not fully clean previous folder: " + ex.Message);
                }
            }

            Directory.CreateDirectory(installPath);
            Console.WriteLine("[+] Destination: " + installPath);
            
            // 3. Extract Files
            Assembly assembly = Assembly.GetExecutingAssembly();
            using (Stream zipStream = assembly.GetManifestResourceStream("app.zip")) {
                if (zipStream == null) {
                    // Fallback: Check if appended to end of EXE (common for simple stubs)
                    zipStream = FindAppendedZip(Process.GetCurrentProcess().MainModule.FileName);
                }

                if (zipStream == null) {
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.WriteLine("\n[!] Error: Application package (app.zip) not found inside the installer.");
                    Console.ReadKey();
                    return;
                }

                // Verify Checksum
                if (!string.IsNullOrEmpty(ExpectedSHA256)) {
                    Console.WriteLine("[+] Verifying integrity...");
                    if (!VerifyChecksum(zipStream, ExpectedSHA256)) {
                        Console.ForegroundColor = ConsoleColor.Red;
                        Console.WriteLine("\n[!] Error: Integrity check failed! The installer package may be corrupted or tampered with.");
                        Console.ReadKey();
                        return;
                    }
                    zipStream.Position = 0; // Reset for extraction
                }

                Console.WriteLine("[+] Installing files (this may take a minute)...");
                
                using (ZipArchive archive = new ZipArchive(zipStream, ZipArchiveMode.Read)) {
                    int total = archive.Entries.Count;
                    int count = 0;
                    foreach (ZipArchiveEntry entry in archive.Entries) {
                        // Path Traversal Protection
                        string fullPath = Path.GetFullPath(Path.Combine(installPath, entry.FullName));
                        if (!fullPath.StartsWith(installPath, StringComparison.OrdinalIgnoreCase)) {
                            throw new Exception("Security Alert: Zip entry attempted path traversal: " + entry.FullName);
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

            // 4. Create Desktop Shortcut
            Console.WriteLine("\n[+] Creating desktop shortcut...");
            CreateDesktopShortcut(Path.Combine(installPath, ExeName));

            // 5. Finalize
            string appExe = Path.Combine(installPath, ExeName);
            if (File.Exists(appExe)) {
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("\n[SUCCESS] " + AppName + " has been updated and installed.");
                Console.WriteLine("[+] Launching application...");
                ProcessStartInfo startInfo = new ProcessStartInfo(appExe);
                startInfo.WorkingDirectory = installPath;
                Process.Start(startInfo);
                success = true;
            }

        } catch (Exception ex) {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("\n[!] CRITICAL ERROR: " + ex.Message);
            Console.WriteLine(ex.StackTrace);
        }

        Console.ResetColor();
        if (!success) {
            Console.WriteLine("\nInstallation finished with errors. Closing in 5 seconds...");
            Thread.Sleep(5000);
        } else {
            Console.WriteLine("\nInstallation finished. Closing...");
        }
    }

    static Stream FindAppendedZip(string selfPath) {
        try {
            FileStream fs = new FileStream(selfPath, FileMode.Open, FileAccess.Read);
            byte[] buffer = new byte[4];
            while (fs.Read(buffer, 0, 4) == 4) {
                if (buffer[0] == 0x50 && buffer[1] == 0x4B && buffer[2] == 0x03 && buffer[3] == 0x04) {
                    fs.Position -= 4;
                    MemoryStream ms = new MemoryStream();
                    fs.CopyTo(ms);
                    ms.Position = 0;
                    fs.Close();
                    return ms;
                }
                fs.Position -= 3;
            }
            fs.Close();
        } catch (Exception ex) {
            Console.WriteLine("[!] Warning searching for payload: " + ex.Message);
        }
        return null;
    }

    static bool VerifyChecksum(Stream stream, string expected) {
        using (SHA256 sha256 = SHA256.Create()) {
            byte[] hashBytes = sha256.ComputeHash(stream);
            string actual = BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();
            return actual.Equals(expected.ToLowerInvariant());
        }
    }

    static void KillExistingProcesses() {
        string procName = Path.GetFileNameWithoutExtension(ExeName);
        foreach (var process in Process.GetProcessesByName(procName)) {
            try {
                process.Kill();
                process.WaitForExit(3000);
            } catch (Exception ex) { 
                Console.WriteLine("[!] Could not kill process " + process.Id + ": " + ex.Message);
            }
        }
    }

    static void CreateDesktopShortcut(string targetPath) {
        try {
            string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
            string shortcutLocation = Path.Combine(desktopPath, AppName + ".lnk");
            
            // Escape single quotes for PowerShell
            string escapedShortcutLocation = shortcutLocation.Replace("'", "''");
            string escapedTargetPath = targetPath.Replace("'", "''");
            string escapedWorkingDir = Path.GetDirectoryName(targetPath).Replace("'", "''");

            string script = $"$WshShell = New-Object -ComObject WScript.Shell; " +
                           $"$Shortcut = $WshShell.CreateShortcut('{escapedShortcutLocation}'); " +
                           $"$Shortcut.TargetPath = '{escapedTargetPath}'; " +
                           $"$Shortcut.WorkingDirectory = '{escapedWorkingDir}'; " +
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
