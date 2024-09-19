
import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const {content} = req.body

    if (!content) {
        throw new ApiError(400, "please enter the valid content")
    }

    const postTweet = await Tweet.create({
        content : content,
        owner: req.user._id
    })

    if (!postTweet) {
        throw new ApiError(400, "tweet not created")
    }

    return res.status(200).json(new ApiResponse(200, postTweet, "tweet posted sucessfully"))
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const {userId} = req.params

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "enter the correct userId")
    }

    const allTweets = await Tweet.aggregate([{
        $match: {owner : new mongoose.Types.ObjectId(userId)}
    },
    {
        $lookup:{
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "details",
            pipeline:[{
                $project:{
                    avatar: 1,
                    fullname: 1,
                }
            }]
        }
    },
    {
        $lookup:{
            from: "likes",
            localField: "_id",
            foreignField: "tweet",
            as: "likes"
        }
    },{
        $addFields:{
            details:{
                $first: "$details"
            },
            likes:{
                $size: "$likes"
            }
        }
    }
])

if (!allTweets || allTweets.length === 0) {
    throw new ApiError(400, "tweet not found")
}

return res.status(200).json(new ApiResponse(200, allTweets, "tweet found"))

})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const {content} = req.body
    const {tweetId} = req.params

    if (!content) {
        throw new ApiError(400, "enter the updated content")
    }
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "enter the correct id")
    }

    const findTweet = await Tweet.findOne({
        $and:[{owner: new mongoose.Types.ObjectId(req.user._id)}, {_id: tweetId}]
    })

    if (!findTweet) {
        throw new ApiError(401, "unauthhorized request")
    }   

    findTweet.content = content
    const updateTweet = await findTweet.save()

    return res.status(200).json(new ApiResponse(200, updateTweet, "tweet update sucessfully"))
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const {tweetId} = req.params

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "enter the correct id")
    }

    const findTweet = await Tweet.findOne({
        $and:[{owner: new mongoose.Types.ObjectId(req.user._id)}, {_id: tweetId}]
    })

    if (!findTweet) {
        throw new ApiError(401, "unauthhorized request")
    }   

    const delTweet = await Tweet.findByIdAndDelete(tweetId)

    return res.status(200).json(new ApiResponse(200, delTweet, "tweet delete sucessfully"))


})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}
