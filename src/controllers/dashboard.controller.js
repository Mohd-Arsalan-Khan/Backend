import mongoose, { isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js"

    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
//     const obj = {}
//     // const {userId} = req.user._id

//     // if (!userId) {
//     //     throw new ApiError(400, "enter the correct userId")
//     // }

//     const getVideoDetails = await User.aggregate([{
//         $match:{
//             _id : new mongoose.Types.ObjectId(req.user?._id)
//         }
//     }, {
//         $lookup:{
//             from: "videos",
//             localField: "_id",
//             foreignField: "owner",
//             as:"totalvideos" 
//         }
//     },{
//         $addFields:{
//             totalvideos: "$totalvideos"
//         }
//     },{
//         $unwind: "$totalvideos"
//     },{
//         $group:{
//             _id: "$_id",
//             totalvideos:{$sum: 1},
//             totalviews: {
//                 $sum: "$totalvideos.views"
//             }
//         }
//     },{
//         $lookup:{
//             from: "users",
//             localField: "_id",
//             foreignField:"subscriber",
//             as:"totalsubs"
//         }
//     },{
//         $addFields:{
//             totalsubs: "$totalsubs"
//         }
//     }, {
//         $project:{
//             fullName : 1,
//             avatar: 1,
//             totalvideos: 1,
//             totalviews: 1,
//             totalsubs:{
//                 $size: "$totalsubs.subscriber"
//             }
//         }
//     }])
//     if (!getVideoDetails) {
//         throw new ApiError(400, "video details not found")
//     }

//     const likesOnVideos = await Video.aggregate([{
//         $match: {
//             owner : new mongoose.Types.ObjectId(req.user?._id)
//         }
//     },{
//         $lookup:{
//             from: "likes",
//             localField: "_id",
//             foreignField: "video",
//             as: "videolikes"
//         }
//     }, {
//         $unwind: "$videolikes"
//     }, {
//         $group:{
//             _id: "$videolikes._id"
//         }
//     },{
//         $count: "$totallikes"
//     }])
//     if (!likesOnVideos) {
//         throw new ApiError(400, "no like found on video")
//     }

//     const likesOnComments = await Comment.aggregate([{
//         $match: {
//             owner : new mongoose.Types.ObjectId(req.user?._id)
//         }
//     },{
//         $lookup:{
//             from: "likes",
//             localField: "_id",
//             foreignField: "comment",
//             as: "commentlikes"
//         }
//     }, {
//         $unwind: "$commentlikes"
//     }, {
//         $group:{
//             _id: "$commentlikes._id"
//         }
//     },{
//         $count: "$totallikes"
//     }])
//     if (!likesOnComments) {
//         throw new ApiError(400, "no like found on video")
//     }

//     const likesOnTweets = await Comment.aggregate([{
//         $match: {
//             owner : new mongoose.Types.ObjectId(req.user?._id)
//         }
//     },{
//         $lookup:{
//             from: "likes",
//             localField: "_id",
//             foreignField: "tweet",
//             as: "tweetlikes"
//         }
//     }, {
//         $unwind: "$tweetlikes"
//     }, {
//         $group:{
//             _id: "$tweetlikes._id"
//         }
//     },{
//         $count: "$totallikes"
//     }])
//     if (!likesOnTweets) {
//         throw new ApiError(400, "no like found on video")
//     }

//     obj["getVideoDetails"] = getVideoDetails,
//     obj["likesOnVideos"] = likesOnVideos,
//     obj["likesOnComments"] = likesOnComments,
//     obj["likesOnTweets"] = likesOnTweets

//     return res.status(200).json(new ApiResponse(200, obj, "all details fetched sucessfully" ))
// })
const getChannelStats = asyncHandler(async (req, res) => {

const channelStats = await User.aggregate([
    {
        $match:{
            _id:new mongoose.Types.ObjectId(req.user?._id)
        }
    },
    {
        $lookup:{
            from:"videos",
            localField:"_id",
            foreignField:"owner",
            as:"allVideos",
            pipeline:[
                {
                    $lookup:{
                        from:"likes",
                        localField:"_id",
                        foreignField:"video",
                        as:"likes"
                    }
                },
                {
                    $addFields:{
                        likesCount:{$size:"$likes"}
                    }
                },
                {
                    $project:{
                        likes:0
                    }
                }
            ]
        }
    },
    {
        $lookup:{
            from:"subscriptions",
            localField:"_id",
            foreignField:"channel",
            as:"subscribers"
        }
    },
    {
        $addFields:{
            totalSubscribers:{$size:"$subscribers"},
            totalVideos:{$size:"$allVideos"},
            totalViews:{$sum:"$allVideos.views"},
            totalLikes:{$sum:"$allVideos.likesCount"}
        }
    },
    {
        $project:{
            totalVideos:1,
            totalViews:1,
            totalLikes:1,
            totalSubscribers:1,
            username:1,
            fullName:1,
            avatar:1,
            coverImage:1,

        }
    }
])

if (channelStats.length<1) {
    throw new ApiError(400,"channel not found");
}

return res
.status(200)
.json(
    new ApiResponse(200,channelStats[0],"get channel stats successfully")
)
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel

    const {channelId} = req.body
    const {page = 1, limit = 10} = req.query

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "enter the correct channelId")
    }

    const allVideo = await Video.aggregate([{
        $match:{
            $and:[{
                owner : new mongoose.Types.ObjectId(channelId)
            },{
                isPublished: true,
            }]
        }
    },{
        $lookup:{
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "ownerDetails"
        }
    },{
        $unwind: "$ownerDetails"
    },{
        $addFields:{
            fullName : "$ownerDetails.fullName",
            username: "$ownerDetails.username",
            avatar: "$ownerDetails.avatar"
        }
    },{
        $project:{
            ownerDetails : 0
        }
    }])

    const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        customLables:{
            totalDocs: "total_videos",
            docs: "videos"
        }
    }

    const videos = await Video.aggregatePaginate(allVideo, options)

    if (!videos) {
        throw new ApiError(400, "no video found")
    }

    return res.status(200).json(new ApiResponse(200, allVideo, "all video fetched successfully"))
})

export {
    getChannelStats, 
    getChannelVideos,
}