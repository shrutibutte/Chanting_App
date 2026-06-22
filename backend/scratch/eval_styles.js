const fs = require('fs');
const path = require('path');

try {
  const filePath = path.join(__dirname, '../../frontend/src/screens/DashboardScreen.js');
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  const startIdx = lines.findIndex(line => line.includes('const styles = StyleSheet.create('));
  if (startIdx === -1) {
    console.error("Could not find Stylesheet declaration");
    process.exit(1);
  }
  
  let styleLines = lines.slice(startIdx).join('\n');
  styleLines = styleLines.replace('const styles =', 'styles =');
  
  // Mock StyleSheet.create to return the raw object
  const StyleSheet = {
    create: (obj) => obj
  };
  
  let styles;
  eval(styleLines);
  
  console.log("SUCCESS: Stylesheet evaluated correctly!");
  console.log("Available Keys:", Object.keys(styles).filter(k => k.toLowerCase().includes('level') || k.toLowerCase().includes('journey')));
} catch (err) {
  console.error("StyleSheet Evaluation Error:", err.message);
  process.exit(1);
}
