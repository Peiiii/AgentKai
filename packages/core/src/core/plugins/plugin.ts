import { ToolRegistration } from "../../services/tools";

export interface Plugin {
    getName(): string;
    getTools(): ToolRegistration[];
}