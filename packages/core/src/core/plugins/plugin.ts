import { ToolRegistration } from "../../types";

export interface Plugin {
    getName(): string;
    getTools(): ToolRegistration[];
}