import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');
const outputPath = path.join(projectRoot, 'src', 'data', 'commitHistory.json');

try {
    // Get git log with a separator that is unlikely to be in the message
    // Format: hash|author|date|message
    const logOutput = execSync('git log --pretty=format:"%h|%an|%aI|%s" --no-merges', {
        cwd: projectRoot,
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });

    const commits = logOutput.split('\n')
        .filter(line => line.trim() !== '')
        .map(line => {
            const [hash, author, date, message] = line.split('|');
            return {
                hash,
                author,
                date,
                message
            };
        });

    const data = {
        generatedAt: new Date().toISOString(),
        totalCommits: commits.length,
        commits: commits
    };

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`Successfully generated history with ${commits.length} commits at ${outputPath}`);

} catch (error) {
    console.error('Error generating commit history:', error);
    process.exit(1);
}
