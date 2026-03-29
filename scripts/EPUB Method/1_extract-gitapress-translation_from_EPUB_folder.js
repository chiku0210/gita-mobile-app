const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// Define your input and output paths
const inputDir = path.join(__dirname, '..', 'assets', 'Gita-EPUB');
const outputFile = path.join(__dirname, '..', 'assets', 'gita_raw_dump.json');


function extractEPUBText() {
    console.log('Starting extraction process...');

    // 1. Get all HTML files from the directory
    if (!fs.existsSync(inputDir)) {
        console.error(`Error: Directory not found at ${inputDir}`);
        return;
    }
    
    const files = fs.readdirSync(inputDir).filter(file => file.endsWith('.html'));

    console.log('files:', files);

    // 2. Sort files numerically (e.g., page_2.html comes before page_10.html)
    files.sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || 0);
        const numB = parseInt(b.match(/\d+/)?.[0] || 0);
        return numA - numB;
    });

    const extractedData = [];

    // 3. Loop through, parse HTML, and extract clean text
    files.forEach(file => {
        const filePath = path.join(inputDir, file);
        const html = fs.readFileSync(filePath, 'utf-8');
        
        // Load the HTML into Cheerio
        const $ = cheerio.load(html);

        // Grab text from the body, normalize whitespace and newlines
        const text = $('body').text().replace(/\s+/g, ' ').trim();
        
        if (text) {
            extractedData.push({
                source_file: file,
                content: text
            });
        }
    });

    // 4. Save to a structured JSON file
    fs.writeFileSync(outputFile, JSON.stringify(extractedData, null, 2));
    console.log(`Success! Extracted ${extractedData.length} pages into ${outputFile}`);
}

extractEPUBText();