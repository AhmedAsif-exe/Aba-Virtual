import { CommentSection } from "react-comments-section";
import "react-comments-section/dist/index.css";
import { useState, useEffect } from "react";
import {
  fetchComments,
  submitComment,
  submitReply,
  editComment,
  deleteComment,
} from "Utils/Queries/Comments";
import { useLocation, useNavigate } from "react-router-dom";
import { useProjectContext } from "Utils/Context";
const Comments = ({ blogId }) => {
  const { user, loggedIn, loading } = useProjectContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState([]);

  useEffect(() => {
    let mounted = true;

    fetchComments(blogId).then((comments) => {
      if (mounted) setData(comments);
    });
    return () => {
      mounted = false;
    };
  }, [blogId]);

  return (
    <>
      {!loading && (
        <CommentSection
          advancedInput={true}
          currentUser={
            loggedIn
              ? {
                  currentUserId: user._id,
                  currentUserImg:
                    user.pfp ||
                    `https://ui-avatars.com/api/?name=${user.name}&background=%23265c7e`,
                  currentUserProfile: "#",
                  currentUserFullName: user.name,
                }
              : null
          }
          logIn={{
            onLogin: () => navigate("/login", { state: { from: location.pathname } }),
            signUpLink: "/signup",
          }}
          commentData={data}
          onSubmitAction={async ({ userId, text }) =>
            await submitComment({ userId, text, blogId })
          }
          onReplyAction={async (data) => {
            await submitReply({
              userId: data.userId,
              text: data.text,
              parentOfRepliedCommentId: data.parentOfRepliedCommentId || null,
              repliedToCommentId: data.repliedToCommentId,
              blogId,
            });
          }}
          onEditAction={async (data) => {
            await editComment(data.comId, data.text);
          }}
          onDeleteAction={async (data) => {
            await deleteComment(data.comIdToDelete);
          }}
          placeholder="Write your comment..."
          inputStyle={{ border: "1px solid rgb(208 208 208)" }}
          formStyle={{ backgroundColor: "white" }}
          submitBtnStyle={{
            border: "1px solid black",
            backgroundColor: "black",
            padding: "7px 15px",
          }}
          cancelBtnStyle={{
            border: "1px solid gray",
            backgroundColor: "gray",
            color: "white",
            padding: "7px 15px",
          }}
          replyInputStyle={{
            borderBottom: "1px solid black",
            color: "black",
          }}
        />
      )}
    </>
  );
};

export default Comments;
