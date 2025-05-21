
import { useState, useCallback } from "react";
import useShowToast from "./useShowToast";

const useBookmark = () => {
  const showToast = useShowToast();
  const [isBookmarking, setIsBookmarking] = useState({});

  const handleBookmark = useCallback(
    async (postId) => {
      try {
        setIsBookmarking((prev) => ({ ...prev, [postId]: true }));
        const res = await fetch(`/api/posts/bookmark/${postId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const data = await res.json();
        if (data.error) {
          showToast("Error", data.error, "error");
          return null;
        }
        showToast(
          "Success",
          data.bookmarked ? "Post bookmarked" : "Post unbookmarked",
          "success"
        );
        return data.bookmarked;
      } catch (error) {
        showToast("Error", error.message || "Failed to bookmark post", "error");
        return null;
      } finally {
        setIsBookmarking((prev) => ({ ...prev, [postId]: false }));
      }
    },
    [showToast]
  );

  return { handleBookmark, isBookmarking };
};

export default useBookmark;


