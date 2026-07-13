import os
import shutil
import subprocess
import sys

print("[BUILD] Starting React frontend build...")
try:
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    print("[BUILD] Running npm install in frontend...")
    subprocess.run([npm_cmd, "install"], cwd="frontend", check=True)
    print("[BUILD] Running npm run build in frontend...")
    subprocess.run([npm_cmd, "run", "build"], cwd="frontend", check=True)
    print("[BUILD] Copying build output to public...")
    if os.path.exists("public"):
        shutil.rmtree("public")
    shutil.copytree("frontend/build", "public")
    print("[BUILD] Build and copy completed successfully.")
except Exception as e:
    print(f"[BUILD] Error: {e}")
    sys.exit(1)
