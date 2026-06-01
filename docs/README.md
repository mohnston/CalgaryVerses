# CalgaryVerses

A small static web starter project.
It's purpose is help Bible students recall where Bible verses are located. It should be engaging and fun.
It should be playable on phone or tablet format. Keep the need for scrolling to a minimum.
Scores or history for the user should be kept on their local device. No need to create user accounts or require login.

In the following games a "verse" may be one or multiple contiguous verses.
1. Scripture recall
	a. Show the player a verse
	b. User guesses Book/Chapter
2. Scripture Match
	a. Show the player a verse
	b. Show user 3 options
	c. User selects the option that is source of verse
3. Book Order
	a. Arrange the books in order
	b. User is shown a list of Bible books and must select them in order of their appearance in the Bible

I would like verses used in the game to be stored in a file. It can be imported or exported during a session. Users can CRUD verses. 
The game will have a theme that is relevant to Calgary, Canada. I have images that I would like to randomly display on the game's home screen. 
I will need a service that will host this app.


## Run

Open `index.html` in a browser, or serve the folder with any static web server.

## Local dev

Start a simple static server and open `http://localhost:8000`:

```bash
python -m http.server 8000
```

## Deploy to GitHub Pages

1. Push this repository to GitHub.
2. In the repository settings enable Pages and serve from the `main` branch (root) or use `gh-pages` branch.
3. Optionally add a GitHub Action to build/publish if you change the branch layout.

Add your Calgary images to `assets/images/` and list their filenames in `src/images.json` (e.g. `["calgary1.jpg"]`). Edit `src/verses.json` to add or update verses.

---

### Quick publish (detailed)

If you want a short copy/paste of the commands to publish from `main` branch root:

```powershell
cd "c:\Users\mohns\OneDrive\Source\CalgaryVerses"
git init
git add .
git commit -m "Initial site"
git branch -M main
git remote add origin https://github.com/<your-username>/CalgaryVerses.git
git push -u origin main
```

After pushing, on GitHub go to **Settings → Pages** and set `Source` to `main` and folder to `/ (root)`. Wait a minute and open the provided URL.

### Helper script

There's a convenience PowerShell script `publish_to_github.ps1` included that prompts for the repo URL and runs the commands above. Run it from PowerShell in the project root:

```powershell
.\publish_to_github.ps1
```

### Note about `.nojekyll`

This repository contains a `.nojekyll` file to prevent GitHub Pages (Jekyll) from ignoring files and folders that start with `_`.

If you'd like I can also create a GitHub Actions workflow to automatically publish on push to `main`.
