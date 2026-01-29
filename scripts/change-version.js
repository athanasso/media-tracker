
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const FILES = {
  appJson: 'app.json',
  packageJson: 'package.json',
  packageLockJson: 'package-lock.json',
  settings: 'app/settings.tsx',
  dataExport: 'src/services/dataExport.ts'
};

rl.question('Enter new version: ', (version) => {
  if (!version) {
    console.error('Version cannot be empty');
    rl.close();
    return;
  }

  console.log(`Updating version to ${version}...`);

  // 1. Update app.json
  updateFileRegex(FILES.appJson, /"version":\s*"[^"]+"/, `"version": "${version}"`);

  // 2. Update package.json
  updateFileRegex(FILES.packageJson, /"version":\s*"[^"]+"/, `"version": "${version}"`);

  // 3. Update package-lock.json (Top level and packages[''])
  updatePackageLock(FILES.packageLockJson, version);

  // 4. Update settings.tsx
  // Pattern: <Text style={styles.menuSubtitle}>3.1.1</Text>
  // Robust pattern: Look for style={styles.menuSubtitle} followed by >version<
  // Since regex lookbehind/lookahead might be tricky, we'll try to match the exact context found in the file.
  // In settings.tsx, the version is inside a Text block. We'll search for the previous version regex.
  // We identify it by assuming it looks like "X.X.X".
  // However, there might be OTHER subtitles.
  // But based on the file content (Step 2966):
  // <Text style={styles.menuTitle}>{t.version}</Text>
  // <Text style={styles.menuSubtitle}>3.1.1</Text>
  // We can look for {t.version} in context?
  // Or just replace any strictly version-like string inside that tag IF we can identify it.
  // But strictly `3.1.1` is unique enough if we updated it manually before. 
  // Wait, if the current version is `3.1.1` in the file `settings.tsx`.
  // I can just replace `>3.1.1<` with `>${version}<`.
  // But the script doesn't know the OLD version.
  // So I must match `>[0-9]+\.[0-9]+\.[0-9]+<`.
  updateFileRegex(FILES.settings, /<Text style={styles\.menuSubtitle}>[0-9]+\.[0-9]+\.[0-9]+<\/Text>/, `<Text style={styles.menuSubtitle}>${version}</Text>`);

  // 5. Update dataExport.ts
  updateFileRegex(FILES.dataExport, /const EXPORT_VERSION = '[^']+';/, `const EXPORT_VERSION = '${version}';`);

  console.log('Files updated. Running prebuild...');
  
  rl.close();

  // Execute command in current shell
  const proc = exec('npx expo prebuild --clean');

  proc.stdout.on('data', (data) => {
    console.log(data.toString());
  });

  proc.stderr.on('data', (data) => {
    console.error(data.toString());
  });

  proc.on('exit', (code) => {
    console.log(`Version update process exited with code ${code}`);
  });
});

function updateFileRegex(filePath, regex, replacement) {
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return;
    }
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if regex matches
    if (!regex.test(content)) {
        console.warn(`Warning: Pattern not found in ${filePath} for regex ${regex}`);
    }
    
    const newContent = content.replace(regex, replacement);
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated ${filePath}`);
}

function updatePackageLock(filePath, version) {
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return;
    }
    try {
        const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        json.version = version;
        if (json.packages && json.packages['']) {
            json.packages[''].version = version;
        }
        fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf8');
        console.log(`Updated ${filePath} (JSON parse)`);
    } catch (e) {
        console.error('Error updating package-lock.json', e);
    }
}
