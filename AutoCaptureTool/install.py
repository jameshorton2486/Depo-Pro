"""
Legacy installer for Auto Capture Tool.
Recommended: Use `pip install -r requirements.txt` instead.
"""
import subprocess
import sys


def install():
    packages = [
        "selenium==4.27.1",
        "webdriver-manager==4.0.2",
        "Pillow==11.0.0",
    ]

    print(f"Installing: {', '.join(packages)}...")
    subprocess.check_call([sys.executable, "-m", "pip", "install"] + packages)
    print("\nSuccess! All packages installed.")
    print("\nNote: Consider using 'pip install -r requirements.txt' instead.")


if __name__ == "__main__":
    install()
