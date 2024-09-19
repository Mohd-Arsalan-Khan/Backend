import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    // TODO: toggle subscription
    const {channelId} = req.params

    console.log(channelId)
    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "enter the correct channelId")
    }
    
    const exsistingSub = await Subscription.findOne({
        subscriber : req.user._id,
        channel: channelId
    })

    if (exsistingSub) {
        const deleteSub = await Subscription.findByIdAndDelete(exsistingSub._id)
        return res.status(200).json(new ApiResponse(200, deleteSub, "sub is deleted"))
    }else{
        const addSub = await Subscription.create({
            subscriber: req.user._id,
            channel : channelId
        })
        return res.status(200).json(new ApiResponse(200, addSub, "you subscribed sucessfully"))
    }
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    // console.log(channelId)
    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "channel id is required")
    }

    const subscriberList = await Subscription.aggregate([{
        $match:{
            channel: new mongoose.Types.ObjectId(channelId)
        }
    },{
        $lookup:{
            from: "users",
            localField: "subscriber",
            foreignField: "_id",
            as: "subscribers"
        }
    },{
        $unwind: "$subscribers"
    },{
        $group:{
            _id: null,
            subscribers:{$push: "$subscribers"},
            totalSubscribers: {$sum: 1}
        }
    },{
        $project:{
            _id: 0,
            subscribers:{
                _id: 1,
                username: 1,
                fullName: 1,
                avatar: 1,
            },
            subCount : "$totalSubscribers"
        }
    }])

    if (!subscriberList) {
        throw new ApiError(400, "subcription list faild to load")
    }

    return res.status(200).json(new ApiResponse(200, subscriberList, "subscription list load sucessfully"))
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
    
    if (!isValidObjectId(subscriberId)) {
        throw new ApiError(400,"subcriber id is required")
    }

    const channelList = await Subscription.aggregate([{
        $match:{
            subscriber : new mongoose.Types.ObjectId(subscriberId)
        }
    },{
        $lookup:{
            from: "users",
            localField: "channel",
            foreignField: "_id",
            as: "channels"
        }
    },{
        $unwind: "$channels"
    },{
        $group:{
            _id: null,
            channels:{$push:"$channels"},
            totalchannel: {$sum:1}
        }
    },{
        $project:{
            _id: 0,
            channels:{
                _id: 1,
                fullName: 1,
                username: 1,
                avatar: 1,
            },
            channelCount : "$totalchannel"
        }
    }])

    if (!channelList) {
        throw new ApiError(400, "channel list faild to load")
    }

    return res.status(200).json(new ApiResponse(200, channelList, "channel list load sucessfully"))
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}