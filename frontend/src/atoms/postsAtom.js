import { atom } from "recoil";

const postsAtom = atom({
	key: "postsAtom",
	default: {
		posts: [],
		stories: [],
		bookmarks: [],
		suggestedPosts: [],
		
	},
});

export default postsAtom;