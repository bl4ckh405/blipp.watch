
import { ALL_MOCK_USERS } from '../constants';
import { User } from '../types';

// Simulate a database of followed usernames
const followedUsernames = new Set<string>(['urbanexplorer', 'travelbug']);

// Simulate network latency
const API_LATENCY = 500;

/**
 * Simulates fetching the list of users that the current user is following.
 */
export const getFollowing = async (): Promise<User[]> => {
    console.log("API: Fetching followed users...");
    return new Promise(resolve => {
        setTimeout(() => {
            const followed = ALL_MOCK_USERS.filter(user => followedUsernames.has(user.username));
            console.log("API: Found followed users:", followed);
            resolve(followed);
        }, API_LATENCY);
    });
};

/**
 * Simulates an API call to ape into a user.
 * @param username The username of the user to ape into.
 */
export const followUser = async (username: string): Promise<{ success: boolean }> => {
    console.log(`API: Aping into user: ${username}`);
    return new Promise(resolve => {
        setTimeout(() => {
            followedUsernames.add(username);
            console.log("API: Current aped set:", followedUsernames);
            resolve({ success: true });
        }, API_LATENCY);
    });
};

/**
 * Simulates an API call to unape a user.
 * @param username The username of the user to unape.
 */
export const unfollowUser = async (username: string): Promise<{ success: boolean }> => {
    console.log(`API: Unaping user: ${username}`);
    return new Promise(resolve => {
        setTimeout(() => {
            followedUsernames.delete(username);
            console.log("API: Current aped set:", followedUsernames);
            resolve({ success: true });
        }, API_LATENCY);
    });
};
