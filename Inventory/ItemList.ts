import { IItem } from "./Item";

export enum TransferType 
{
    None,
    Stacked,
    Replaced
}


export interface IItemList
{
    items:(IItem|null)[];
    maxCount:number;

    onItemSetEvent: ((index:number) => void)[];
    onQuantityChangedEvent: ((index:number) => void)[];

    countItem: (itemId:string) => number;
    countSpaceFor: (item:IItem) => number;

    setItem: (index:number, item:IItem|null) => TransferType;
    swapItems: (other:IItemList, otherIndex:number, index:number) => void;
    addItem: (item:IItem) => void;

    validate: (item:IItem|null, index:number) => boolean;
    forceSetItem: (index:number, item:IItem|null) => TransferType;
    //onItemSet: (index:number, prev:IItem|null, curr:IItem|null) => void;

}



export default class ItemList implements IItemList
{
    protected _items:(IItem|null)[] = [];

    public get items() :(IItem|null)[]
    {
        return this._items;
    }

    maxCount:number = 10;

    onItemSetEvent: (( index: number) => void)[] = [];
    onQuantityChangedEvent: ((index: number) => void)[] = [];

    constructor ()
    {
        for (let i = 0; i < this.maxCount; i++)
            this._items.push (null);
    }

    
    countItem (itemId:string) : number 
    {
        return this._items.reduce ((prev, curr) => curr?.id === itemId ? prev + curr.quantity : prev , 0);
    }
    countSpaceFor (item:IItem) : number
    {
        let counter = 0;
        for (const inventoryItem of this._items)
        {
            if (inventoryItem === null)
                counter += item.quantityMax;
            else if (inventoryItem.id === item.id)
                counter += inventoryItem.spaceLeft;
        }

        return counter;
    }

    private innerSetItem (index:number, item:IItem|null) : void 
    {
        const prev = this._items[index];
        this._items[index] = item;

        if (prev)
            prev.onQuantityChangedEvent = [];
        
        //Listen for quantity changes
        if (item)
            item.onQuantityChangedEvent = [() => {

                if (item.quantity <= 0)
                {
                    this.setItem (index, null);
                    return;
                }

                this.onQuantityChanged (index);
        }]

        this.onItemSet (index, prev, item);
    }

    public forceSetItem (index:number, item:IItem|null) : TransferType
    {
        if (item === null)
            {
                this.innerSetItem (index, null);
                return TransferType.Replaced;
            }

            const inventoryItem = this._items[index];
    
            if (inventoryItem === null || inventoryItem.id !== item.id)
            {
                const clone = item.clone ();
    
                this.innerSetItem (index, clone);
                item.quantity -= clone.quantity;
    
                return TransferType.Replaced;
            }
             else if (inventoryItem.id === item.id)
            {
                const added = inventoryItem.addToStack (item.quantity);
                item.quantity -= added;
                return TransferType.Stacked;
            }
            return TransferType.None;
    }

    setItem (index:number, item:IItem|null) : TransferType 
    {
        if (!this.validate (item, index))
            return TransferType.None;

        return this.forceSetItem (index, item);
    }

    swapItems (other: IItemList, otherIndex: number, index: number) : void
    {
        const otherItem = other.items[otherIndex]!;
        const thisItem = this.items[index];

        if (this.validate (otherItem, index) && other.validate (thisItem, index))
        {
            //If item was replaced, we swap them out
            if (this.setItem (index, otherItem) === TransferType.Replaced && thisItem)
                other.setItem (otherIndex, thisItem);
        }
    }

   

    addItem (item:IItem) : void 
    {
        for (let i = 0; i < this._items.length; i++)
        {
            const thisItem = this._items[i];

            if (thisItem === null || thisItem.id === item.id)
                this.setItem (i, item);

            if (item.quantity <= 0)
                break;
        }
    }

   


    public validate (item: IItem|null, index: number) : boolean
    {
        return true;
    }

    protected onItemSet (index: number, prev: IItem | null, curr: IItem | null) : void
    {
        this.onItemSetEvent.forEach (el => el (index));
    }

    protected onQuantityChanged (index:number) : void 
    {
        this.onQuantityChangedEvent.forEach (el => el (index));
    }
    
   
}