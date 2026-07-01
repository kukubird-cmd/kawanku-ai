# MindBuddy — Team Collaboration Guide (Git & GitHub)

This guide shows you how to host MindBuddy on GitHub so your team can clone, edit, push, and pull changes together.

---

## 🔒 Crucial Security First
To prevent your Gemini API keys from leaking publicly on GitHub:
* We created a file called `config.js` containing your key.
* We created `.gitignore` to tell Git to **ignore** `config.js`. It will never be pushed.
* We created `config.example.js` as a template for your friends.

---

## 📤 Step 1: Push Your Code to GitHub (Do this once)

1. Open your browser and go to **[github.com](https://github.com)**.
2. Log in and click **"New"** to create a new repository.
   - **Repository Name:** `mindbuddy`
   - **Public/Private:** Choose Private (recommended for your competition key safety) or Public.
   - **Do NOT** check "Add a README", "Add .gitignore", or "Choose a license" (we already have these).
3. Click **"Create Repository"**.
4. GitHub will show you some commands. Run these three commands in your terminal:

```powershell
# 1. Rename the default branch to main
git branch -M main

# 2. Link your local project to GitHub (Replace URL with your own repo URL)
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/mindbuddy.git

# 3. Push your code to GitHub
git push -u origin main
```

---

## 👥 Step 2: Add Your Friends to the Repository

If your repository is **Private**, you must invite your friends so they can access and push changes:
1. Go to your repository page on GitHub.
2. Click **Settings** (tab at the top).
3. Click **Collaborators** in the left sidebar.
4. Click **Add people** and enter your friends' GitHub usernames or emails.
5. They will receive an email invitation. They **must accept** the invite before they can push.

---

## 📥 Step 3: How Your Friends Clone and Set Up

Once your friends accept the invite, send them these instructions:

### 1. Clone the project:
```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/mindbuddy.git
cd mindbuddy
```

### 2. Set up local API key:
If they try to run the project now, it will look blank or default to local chat because `config.js` is ignored. They need to create their own local configuration:
- Copy the file `config.example.js` and rename the copy to `config.js`.
- Open `config.js` and replace `'YOUR_GEMINI_API_KEY_HERE'` with their own Gemini API key (or yours, shared privately).

```javascript
// config.js
window.GEMINI_API_KEY = 'their_actual_api_key';
```

---

## 🔄 Step 4: Daily Workflow Checklist

When coding together, follow this standard Git workflow to avoid conflicts:

### 1. Get the latest updates (Always do this before writing code):
```bash
git pull origin main
```

### 2. Check what files you have modified:
```bash
git status
```

### 3. Save your changes:
```bash
# Add all files you modified
git add .

# Save with a descriptive message
git commit -m "Added heart animation to avatar"
```

### 4. Share your changes with the team:
```bash
git push origin main
```
