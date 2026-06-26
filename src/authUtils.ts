export function encriptarPassword(password: string): string {
    return password
        .split('')
        .map((char, index) => {
            const position = index + 1;
            return String.fromCharCode(char.charCodeAt(0) + position);
        })
        .join('');
}

export function desencriptarPassword(hash: string): string {
    return hash
        .split('')
        .map((char, index) => {
            const position = index + 1;
            return String.fromCharCode(char.charCodeAt(0) - position);
        })
        .join('');
}
