import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

// Automatically clean up expired keys every minute
crons.interval(
    "vacuum expired keys",
    { minutes: 1 },
    api.example.vacuum,
);

export default crons;
