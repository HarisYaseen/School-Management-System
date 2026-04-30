using System;
using System.IO;
using System.IO.Compression;
using System.Diagnostics;
using System.Reflection;
using System.Threading;
using System.Linq;

class SMSInstaller {
    static string AppName = "SMS Connect";
    static string FolderName = "SMSConnect";
    static string ExeName = "SMS Connect.exe";

    static void Main() {
        Console.Title = AppName + " Installer";
        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine("========================================");
        Console.WriteLine("     " + AppName + " Official Installer");
        Console.WriteLine("========================================");
        Console.ResetColor();

        try {
            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string installPath = Path.Combine(localAppData, FolderName);
            
            // 1. Kill existing process if running
            Console.WriteLine("[+] Checking for running instances...");
            KillExistingProcesses();

            // 2. Clean up previous installation
            if (Directory.Exists(installPath)) {
                Console.WriteLine("[!] Previous version found. Updating...");
                try { 
                    // Try to delete several times in case of locked files
                    for(int i=0; i<3; i++) {
                        try { Directory.Delete(installPath, true); break; }
                        catch { Thread.Sleep(1000); }
                    }
                } catch { 
                    Console.WriteLine("[!] Warning: Could not fully clean previous folder. Proceeding anyway...");
                }
            }

            Directory.CreateDirectory(installPath);
            Console.WriteLine("[+] Destination: " + installPath);
            
            // 3. Extract Files
            Assembly assembly = Assembly.GetExecutingAssembly();
            using (Stream zipStream = assembly.GetManifestResourceStream("app.zip")) {
                if (zipStream == null) {
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.WriteLine("\n[!] Error: Application package (app.zip) not found inside the installer.");
                    Console.ReadKey();
                    return;
                }

                Console.WriteLine("[+] Installing files (this may take a minute)...");
                
                using (ZipArchive archive = new ZipArchive(zipStream, ZipArchiveMode.Read)) {
                    int total = archive.Entries.Count;
                    int count = 0;
                    foreach (ZipArchiveEntry entry in archive.Entries) {
                        string fullPath = Path.Combine(installPath, entry.FullName);
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
            }

        } catch (Exception ex) {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("\n[!] CRITICAL ERROR: " + ex.Message);
        }

        Console.ResetColor();
        Console.WriteLine("\nInstallation finished. Closing in 3 seconds...");
        Thread.Sleep(3000);
    }

    static void KillExistingProcesses() {
        string procName = Path.GetFileNameWithoutExtension(ExeName);
        foreach (var process in Process.GetProcessesByName(procName)) {
            try {
                process.Kill();
                process.WaitForExit(3000);
            } catch { }
        }
    }

    static void CreateDesktopShortcut(string targetPath) {
        try {
            string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
            string shortcutLocation = Path.Combine(desktopPath, AppName + ".lnk");
            
            // Using a simple PowerShell command to create shortcut to avoid COM reference issues
            string script = $"$WshShell = New-Object -ComObject WScript.Shell; " +
                           $"$Shortcut = $WshShell.CreateShortcut('{shortcutLocation}'); " +
                           $"$Shortcut.TargetPath = '{targetPath}'; " +
                           $"$Shortcut.WorkingDirectory = '{Path.GetDirectoryName(targetPath)}'; " +
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
