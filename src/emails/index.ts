import schedule from "node-schedule";
import emails from "./emails";

export default async function automaticEmails(): Promise<void> {
    const job = schedule.scheduleJob('*/5 * * * *', async () => {
        await emails()
    });
}
