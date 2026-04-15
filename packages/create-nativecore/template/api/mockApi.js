/**
 * Mock API Helper Functions
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple JWT-like token generation for local development only.
function generateToken(user) {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour expiry
    };

    const payloadSegment = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `${header}.${payloadSegment}.mock`;
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
    
    const user = data.users.find(u => u.email === email && u.password === password);
    
    if (!user) {
        return {
            status: 401,
            data: { error: 'Invalid email or password' }
        };
    }
    
    const accessToken = generateToken(user);
    const refreshToken = generateToken(user); // Same for demo
    
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

// Verify token (simplified - just check if exists)
function verifyToken(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return false;
    }
    
    const token = authHeader.split(' ')[1];

    const parsePayload = (rawToken) => {
        if (!rawToken) return null;

        try {
            if (rawToken.includes('.')) {
                const [, payloadSegment] = rawToken.split('.');
                if (!payloadSegment) return null;

                const normalized = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
                const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '=');
                return JSON.parse(Buffer.from(padded, 'base64').toString());
            }

            return JSON.parse(Buffer.from(rawToken, 'base64').toString());
        } catch {
            return null;
        }
    };

    try {
        const payload = parsePayload(token);
        if (!payload) {
            return false;
        }

        // Check if expired
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            return false;
        }
        return payload;
    } catch (e) {
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
