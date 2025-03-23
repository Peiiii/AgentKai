import { EnvProvider } from "@agentkai/core";


export class NodeEnvProvider implements EnvProvider {
    get(key: string, defaultValue?: string): string | undefined {
        return process.env[key] || defaultValue;
    }

    set(key: string, value: string): void {
        process.env[key] = value;
    }

    getAll(): Record<string, string> {
        const env: Record<string, string> = {};
        for (const key in process.env) {
            if (process.env[key] !== undefined) {
                env[key] = process.env[key] as string;
            }
        }
        return env;
    }
}

