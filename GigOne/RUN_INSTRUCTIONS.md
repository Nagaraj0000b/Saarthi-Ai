# How to Run Saarthi (GigOne) on Your Phone

Because you are testing a real mobile phone on a strictly secured University Wi-Fi, you **must use your phone's Mobile Hotspot** to test the app. 

Whenever you sit down to code, follow these exact steps:

---

### Step 1: Prepare Your Network
1. Turn on the **Mobile Hotspot** on your Android/iPhone.
2. Connect your **Laptop** to your phone's Hotspot Wi-Fi.
3. Open a terminal on your laptop and type `ipconfig`.
4. Look for the `IPv4 Address` under your Wi-Fi adapter (it will look something like `192.168.x.x` or `10.159.x.x`).

---

### Step 2: Update the App's API Address
1. Open the file: `mobile/src/services/api.ts`
2. Change line 17 to match your new Hotspot IP address:
```typescript
const API_URL = 'http://YOUR_NEW_HOTSPOT_IP:5000/api';
```

---

### Step 3: Start the Backend Server
Open a new terminal, navigate to the `server` folder, and run:
```powershell
cd server
npm run dev
```
*(You should see "🚀 Server running on port 5000 (bound to 0.0.0.0)")*

---

### Step 4: Start the Mobile App
Open a **second terminal**, navigate to the `mobile` folder, and run this **exact command**. 
*(Make sure to replace `YOUR_NEW_HOTSPOT_IP` with the IP you found in Step 1!)*

```powershell
cd mobile
$env:REACT_NATIVE_PACKAGER_HOSTNAME='YOUR_NEW_HOTSPOT_IP'; npx expo start --clear
```

**Example:** If your IP is `192.168.43.120`, the command is:
`$env:REACT_NATIVE_PACKAGER_HOSTNAME='192.168.43.120'; npx expo start --clear`

---

### Step 5: Test on Phone!
1. Once the QR code appears in your terminal, check the text right above it. It **MUST** say:
   `› Metro waiting on exp://YOUR_NEW_HOTSPOT_IP:8081`
2. If it does, open the **Expo Go** app on your phone and scan the QR code!

---

### Alternative: Using ADB Reverse (USB Debugging)
If you prefer not to change the IP address every time and are testing with a USB cable connected, you can forward the ports directly:

1. Ensure **USB Debugging** is enabled on your phone.
2. Connect your phone to your laptop via USB.
3. Open a terminal and run the following commands to forward your backend (5000) and frontend (8081) ports to your phone:
```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" reverse tcp:5000 tcp:5000
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" reverse tcp:8081 tcp:8081
```

> **Troubleshooting: "more than one device/emulator" Error**
> If you get this error, it means you have an emulator running AND your phone plugged in. Run `& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices` to find your phone's ID, then use the `-s` flag to target it specifically, like this:
> `& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" -s YOUR_DEVICE_ID reverse tcp:5000 tcp:5000`

4. Now, your mobile app can safely use `http://localhost:5000/api` or `http://127.0.0.1:5000/api` to reach the backend running on your laptop!
