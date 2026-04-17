/**
 * Mock API Helper Functions
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = crypto.randomBytes(32).toString('hex');

function generateToken(user, expiresInSeconds = 3600) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
        iat: Math.floor(Date.now() / 1000)
    };

    const payloadSegment = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto.createHmac('sha256', JWT_SECRET)
        .update(`${header}.${payloadSegment}`)
        .digest('base64url');
    return `${header}.${payloadSegment}.${signature}`;
}

// Read JSON file
function readJSON(filename) {
    const filePath = path.join(__dirname, 'data', filename);
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
}

// Handle login
function handleLogin(body) {
    const { email, password } = body;
    const data = readJSON('users.json');
    
    const user = data.users.find(u => {
        if (u.email !== email) return false;
        // Hash comparison for stored passwords
        const inputHash = crypto.createHash('sha256').update(password).digest('hex');
        const storedHash = crypto.createHash('sha256').update(u.password).digest('hex');
        try {
            return crypto.timingSafeEqual(Buffer.from(inputHash), Buffer.from(storedHash));
        } catch {
            return false;
        }
    });
    
    if (!user) {
        return {
            status: 401,
            data: { error: 'Invalid email or password' }
        };
    }
    
    const accessToken = generateToken(user, 3600);       // 1 hour
    const refreshToken = generateToken(user, 7 * 24 * 3600); // 7 days
    
    return {
        status: 200,
        data: {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        }
    };
}

// Handle dashboard stats
function handleDashboard() {
    const data = readJSON('dashboard.json');
    return {
        status: 200,
        data
    };
}

function handleVerify(user) {
    return {
        status: 200,
        data: {
            authenticated: true,
            user: {
                id: user.userId,
                email: user.email,
                name: user.name,
                role: user.role
            }
        }
    };
}

function handleUserDetail(userId) {
    const data = readJSON('users.json');
    const user = data.users.find(u => String(u.id) === String(userId));

    if (!user) {
        return {
            status: 404,
            data: { error: 'User not found' }
        };
    }

    return {
        status: 200,
        data: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString()
        }
    };
}

function verifyToken(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return false;
    }
    
    const token = authHeader.split(' ')[1];
    if (!token) return false;

    try {
        const parts = token.split('.');
        if (parts.length !== 3) return false;

        const [headerSegment, payloadSegment, signatureSegment] = parts;

        // Verify signature
        const expectedSignature = crypto.createHmac('sha256', JWT_SECRET)
            .update(`${headerSegment}.${payloadSegment}`)
            .digest('base64url');

        if (!crypto.timingSafeEqual(
            Buffer.from(signatureSegment),
            Buffer.from(expectedSignature)
        )) {
            return false;
        }

        // Decode payload
        const normalized = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '=');
        const payload = JSON.parse(Buffer.from(padded, 'base64').toString());

        // Check expiration (required)
        if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
            return false;
        }

        return payload;
    } catch {
        return false;
    }
}

export {
    handleLogin,
    handleDashboard,
    handleVerify,
    handleUserDetail,
    verifyToken
};
