using System;
using System.IO;
using System.Diagnostics;
using System.Reflection;
using System.Runtime.InteropServices;

class Program {
    static void Main(string[] args) {
        Console.WriteLine("-------------------------------------------");
        Console.WriteLine("    SMS CONNECT | PRODUCTION SETUP         ");
        Console.WriteLine("-------------------------------------------");
        Console.WriteLine("Initializing local environment...");

        string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        string installDir = Path.Combine(localAppData, "SMSConnect");
        string exePath = Path.Combine(installDir, "sms-connect.exe");

        try {
            // Force kill the app if it's running to unlock DLLs
            Console.WriteLine("Closing existing application instances...");
            foreach (var process in Process.GetProcessesByName("sms-connect")) {
                try { 
                    process.Kill(); 
                    process.WaitForExit(3000); 
                } catch {}
            }

            if (Directory.Exists(installDir)) {
                Console.WriteLine("Updating existing installation...");
                // Attempt to delete with a few retries (to handle slow process releases)
                for (int i = 0; i < 3; i++) {
                    try { 
                        Directory.Delete(installDir, true); 
                        break; 
                    } catch { System.Threading.Thread.Sleep(1000); }
                }
            }
            Directory.CreateDirectory(installDir);

            string selfPath = Process.GetCurrentProcess().MainModule.FileName;
            string tempZip = Path.Combine(Path.GetTempPath(), "sms_setup_payload.zip");

            // 1. Locate and Extract ZIP payload (Binary Appended)
            using (FileStream fs = new FileStream(selfPath, FileMode.Open, FileAccess.Read)) {
                long offset = 0;
                byte[] buffer = new byte[4];
                while (fs.Read(buffer, 0, 4) == 4) {
                    if (buffer[0] == 0x50 && buffer[1] == 0x4B && buffer[2] == 0x03 && buffer[3] == 0x04) {
                        offset = fs.Position - 4;
                        break;
                    }
                    fs.Position -= 3;
                }

                if (offset == 0) {
                    Console.WriteLine("ERROR: Installer payload missing.");
                    return;
                }

                Console.WriteLine("Extracting application components...");
                fs.Position = offset;
                using (FileStream ts = new FileStream(tempZip, FileMode.Create, FileAccess.Write)) {
                    fs.CopyTo(ts);
                }
            }

            // 2. Extract using ZipFile (requires System.IO.Compression.FileSystem)
            ExtractZip(tempZip, installDir);

            // 3. Cleanup
            try { File.Delete(tempZip); } catch {}

            Console.WriteLine("Creating desktop access icon...");
            CreateShortcut(exePath, installDir);

            Console.WriteLine("SUCCESS! Deployment Complete.");
            Process.Start(new ProcessStartInfo(exePath) { WorkingDirectory = installDir });

        } catch (Exception ex) {
            Console.WriteLine("\nCRITICAL ERROR: " + ex.Message);
            Console.WriteLine("\nPlease try running as Administrator.");
            Console.ReadLine();
        }
    }

    static void ExtractZip(string zipPath, string destDir) {
        try {
            System.IO.Compression.ZipFile.ExtractToDirectory(zipPath, destDir);
        } catch (Exception ex) {
            throw new Exception("Extraction failed: " + ex.Message);
        }
    }

    static void CreateShortcut(string target, string workingDir) {
        string desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
        string shortcutPath = Path.Combine(desktop, "SMS Connect.lnk");
        try {
            Type t = Type.GetTypeFromCLSID(new Guid("72C24DD5-D70A-438B-8A42-98424B88AFB8"));
            dynamic shell = Activator.CreateInstance(t);
            var shortcut = shell.CreateShortcut(shortcutPath);
            shortcut.TargetPath = target;
            shortcut.WorkingDirectory = workingDir;
            shortcut.IconLocation = target + ",0";
            shortcut.Save();
        } catch {}
    }
}
