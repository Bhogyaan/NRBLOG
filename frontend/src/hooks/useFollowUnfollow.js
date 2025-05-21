import { useState, useCallback, useEffect } from "react";
import { useRecoilState } from "recoil";
import userAtom from "../atoms/userAtom";
import useShowToast from "./useShowToast";

const useFollowUnfollow = (user) => {
  const [currentUser, setCurrentUser] = useRecoilState(userAtom);
  const [following, setFollowing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const showToast = useShowToast();

  // Initialize following state
  const checkFollowing = useCallback(() => {
    if (!currentUser || !user?._id) {
      console.warn("User ID is missing in useFollowUnfollow", {
        currentUserExists: !!currentUser,
        userIdExists: !!user?._id,
      });
      return false;
    }
    return currentUser.following?.includes(user._id) || false;
  }, [currentUser, user?._id]);

  useEffect(() => {
    if (user?._id && currentUser) {
      setFollowing(checkFollowing());
    }
  }, [checkFollowing, user?._id, currentUser]);

  const handleFollowUnfollow = async () => {
    if (!currentUser?._id) {
      showToast("Error", "Please login to follow", "error");
      console.error("Current user ID is missing");
      return;
    }
    if (!user?._id) {
      showToast("Error", "Target user ID is missing", "error");
      console.error("Target user ID is missing");
      return;
    }
    if (updating) {
      console.log("Follow/unfollow already in progress");
      return;
    }
    if (user.isBanned) {
      showToast("Error", "Cannot follow a banned user", "error");
      return;
    }

    setUpdating(true);
    try {
      const res = await fetch(`/api/users/follow/${user._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text();
        if (res.status === 404) {
          throw new Error("Follow endpoint not found. Please check server configuration.");
        }
        throw new Error(`Request failed with status ${res.status}: ${text}`);
      }
      const data = await res.json();
      if (data.error) {
        showToast("Error", data.error, "error");
        return;
      }

      if (data.message === "Followed successfully") {
        showToast("Success", `You are now following ${user.name || user.username}`, "success");
        setFollowing(true);
        setCurrentUser((prev) => ({
          ...prev,
          following: [...(prev.following || []), user._id],
        }));
      } else {
        showToast("Success", `You have unfollowed ${user.name || user.username}`, "success");
        setFollowing(false);
        setCurrentUser((prev) => ({
          ...prev,
          following: prev.following?.filter((id) => id !== user._id) || [],
        }));
      }
    } catch (error) {
      showToast("Error", "Failed to follow/unfollow user. Please try again.", "error");
    } finally {
      setUpdating(false);
    }
  };

  return { handleFollowUnfollow, updating, following };
};

export default useFollowUnfollow;