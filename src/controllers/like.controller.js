import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
//TODO: toggle like on video
// 1. get videoId from params URL
// 2. check if the user has already liked the video
// 3. if already liked then delete the like
// 4. if not liked then add the like

    const {videoId} = req.params
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "video not found")
    }

    const videoLiked = await Like.findOne(
        {
            $and: [{
                likedBy: req.user._id
            },
        {
            video: videoId
        }]
        }
    )

    if (videoLiked) {
        const unLike = await Like.findByIdAndDelete(videoLiked._id)

        return res.status(200).json(new ApiResponse(200, unLike, "video is unliked"))
    }

    const Liked = await Like.create(
        {
            likedBy: req.user._id,
            video: videoId
        }
    )

    return res.status(200).json(new ApiResponse(200, Liked, "Video is liked"))

})

const toggleCommentLike = asyncHandler(async (req, res) => {
    //TODO: toggle like on comment
    const {commentId} = req.params
    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "comment not found")
    }

    const commentLiked = await Like.findOne({
        $and:[{
            likedBy: req.user._id,
        },
        {
            comment : commentId,
        }]
    })

    if (commentLiked) {
        const unLike = await Like.findByIdAndDelete(commentLiked._id)

        return res.status(200).json(new ApiResponse(200, unLike, "comment unlike"))
    }

    const Liked = await Like.create({
        likedBy: req.user._id,
        comment: commentId,
    })

    return res.status(200).json(new ApiResponse(200, Liked, "comment is liked"))

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    //TODO: toggle like on tweet
    const {tweetId} = req.params
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "comment not found")
    }

    const tweetLiked = await Like.findOne({
        $and:[{
            likedBy: req.user._id,
        },
        {
            tweet : tweetId,
        }]
    })

    if (tweetLiked) {
        const unLike = await Like.findByIdAndDelete(tweetLiked._id)

        return res.status(200).json(new ApiResponse(200, unLike, "comment unlike"))
    }

    const Liked = await Like.create({
        likedBy: req.user._id,
        tweet: tweetId,
    })

    return res.status(200).json(new ApiResponse(200, Liked, "tweet is liked"))
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos

    if (!req.user?._id) {
        throw new ApiError(400,"unauthorized request")
    }

    const likedVideo = await Like.aggregate([{
        $match:{
            likedBy: new mongoose.Types.ObjectId(req.user?._id)
        },
    },{
        $lookup:{
            from: "videos",
            localField: "video",
            foreignField: "_id",
            as:"video",
            pipeline:[{
                $lookup:{
                    from: "users",
                    localField: "owner",
                    foreignField:"_id",
                    as:"owner",
                    pipeline:[{
                        $project:{
                            fullName: 1,
                            username: 1,
                            avatar: 1,
                        }
                    }
                ]
                }
            },
            {
                $addFields:{
                    owners:{
                        $first: "$owner"
                    }
                }
            }
        ]
        }
    },{
        $addFields:{
            video:{
                $first: "$video"
            }
        }
    },{
        $project:{
            video: 1
        }
    }])
    // console.log(likedVideo)
    if (!likedVideo) {
        throw new ApiError(400, "no video found")
    }

    return res.status(200).json(new ApiResponse(200, likedVideo, "liked video fetched"))

})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}