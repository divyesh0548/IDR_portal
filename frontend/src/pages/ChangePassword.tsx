import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function ChangePassword() {
    const navigate = useNavigate();
    const { user, isLoading } = useAuth(); // Destructure isLoading from useAuth
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Check if the user is still loading or hasn't been fetched yet
    useEffect(() => {
        if (isLoading) {
            // If the user is still loading, don't navigate or show content yet
            return;
        }

        // If user is null, redirect to login page
        if (!user) {
            navigate("/login");
        }
    }, [user, isLoading, navigate]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError("");

        // Check if the new password and confirm password match
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            setIsSubmitting(false);
            return;
        }

        try {
            // Ensure the user exists
            if (!user) {
                setError("User not found");
                setIsSubmitting(false);
                return;
            } else {
                // Call API to update the password
                await api.updatePassword(user.id.toString(), newPassword);
                // Redirect to login after password change
                navigate("/login");
            }
        } catch (err) {
            setError("Failed to update password. Please try again.");
            setIsSubmitting(false);
        }
    };


    // Determine where to navigate when the user clicks back based on their role
    const handleBackClick = () => {
        if (user?.role?.toLowerCase() === "snta") {
            navigate("/snta/dashboard");
        } else if (user?.role?.toLowerCase() === "client") {
            navigate("/client/dashboard");
        } else {
            navigate("/dashboard"); // Default case if role is not recognized
        }
    };

    // If the page is still loading (waiting for user data), show a loading message or spinner
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-sm text-muted-foreground">Please wait...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
            <div className="w-full max-w-md">
                <div className="rounded-xl border bg-background p-6 shadow-sm sm:p-8">
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold tracking-tight">Change Password</h2>
                        <p className="text-sm text-muted-foreground">
                            Choose a strong password you don’t use elsewhere.
                        </p>
                    </div>

                    {error && (
                        <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input
                                id="newPassword"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>

                        <Button type="submit" disabled={isSubmitting} className="w-full">
                            {isSubmitting ? "Updating..." : "Update Password"}
                        </Button>
                        <div className="flex justify-center">
                            <Button onClick={handleBackClick} variant="outline" className="w-full">
                                Back to Dashboard
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

    );
}
